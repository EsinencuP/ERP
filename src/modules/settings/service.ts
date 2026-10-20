import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/password";
import { hasPermission } from "@/lib/permissions";
import type { Result, SessionContext } from "@/types/shared";
import { getSettingsError, withSettingsMutation } from "./access";
import { acceptInviteSchema, inviteSchema, inviteVersionSchema, memberChangeSchema } from "./schema";
import type { AcceptInviteInput, InviteInput, MemberChange } from "./types";

async function audit(tx: Prisma.TransactionClient, session: Pick<SessionContext, "userId" | "workspaceId" | "name">, entityType: string, entityId: string, title: string, before: Prisma.InputJsonObject | null, after: Prisma.InputJsonObject) {
  await tx.auditLog.create({ data: { workspaceId: session.workspaceId, actorId: session.userId, actor: session.name, domain: "settings", action: before ? "updated" : "created", entityType, entityId, title, before: before ?? Prisma.DbNull, after } });
}
/** Change only a current workspace membership; preserve the global user and revoke tenant sessions atomically. */
export async function updateMember(input: MemberChange): Promise<Result<true>> {
  const parsed = memberChangeSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Check the member and current version");
  return withSettingsMutation(async (tx, session) => {
    const data = parsed.data;
    const member = await tx.membership.findUnique({ where: { userId_workspaceId: { userId: data.userId, workspaceId: session.workspaceId } }, include: { user: { select: { email: true, isActive: true } } } });
    if (!member) return err("NOT_FOUND", "Workspace member not found");
    if (member.version !== data.version) return err("CONFLICT", "This membership has changed. Reload the members list");
    if (data.userId === session.userId) return err("FORBIDDEN", "Another administrator must change your own role or access");
    if (session.role !== "SUPER_ADMIN" && (data.role === "SUPER_ADMIN" || member.role === "SUPER_ADMIN")) return err("FORBIDDEN", "Only a super administrator can manage super administrators");
    if (data.isActive && !member.user.isActive) return err("FORBIDDEN", "The account is disabled globally. Contact the installation administrator");
    if (member.isActive && hasPermission(member.role, "canManageUsers") && (!data.isActive || !hasPermission(data.role, "canManageUsers"))) {
      const count = await tx.membership.count({ where: { workspaceId: session.workspaceId, isActive: true, role: { in: ["ADMIN", "SUPER_ADMIN"] }, user: { isActive: true } } });
      if (count <= 1) return err("FORBIDDEN", "The workspace must retain an active administrator");
    }
    if (member.role === data.role && member.isActive === data.isActive) return ok(true as const);
    await tx.membership.update({ where: { userId_workspaceId: { userId: data.userId, workspaceId: session.workspaceId }, version: data.version }, data: { role: data.role, isActive: data.isActive, version: { increment: 1 } } });
    await tx.session.deleteMany({ where: { userId: data.userId, workspaceId: session.workspaceId } });
    await audit(tx, session, "Membership", data.userId, member.user.email, { role: member.role, isActive: member.isActive, version: member.version }, { role: data.role, isActive: data.isActive, version: member.version + 1 });
    return ok(true as const);
  });
}
/** Create one email-bound, seven-day invitation; expose its random secret only in this authorized response. */
export async function createInvitation(input: InviteInput): Promise<Result<{ id: string; token: string; email: string; expiresAt: string }>> {
  const parsed = inviteSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Enter a valid email and role");
  return withSettingsMutation(async (tx, session) => {
    const { email, role } = parsed.data;
    if (role === "SUPER_ADMIN" && session.role !== "SUPER_ADMIN") return err("FORBIDDEN", "Only a super administrator can manage super administrators");
    if (await tx.membership.findFirst({ where: { workspaceId: session.workspaceId, user: { email } }, select: { userId: true } })) return err("CONFLICT", "This person is already a member. Use Reactivate for inactive members");
    const previous = await tx.workspaceInvitation.findFirst({ where: { workspaceId: session.workspaceId, email, status: "PENDING" } });
    if (previous && previous.expiresAt > new Date()) return err("CONFLICT", "An active invitation already exists. Revoke it before creating another");
    if (previous) {
      await tx.workspaceInvitation.update({ where: { id: previous.id, version: previous.version }, data: { status: "REVOKED", version: { increment: 1 } } });
      await audit(tx, session, "WorkspaceInvitation", previous.id, email, { status: "PENDING", version: previous.version }, { status: "REVOKED", version: previous.version + 1 });
    }
    const token = randomBytes(32).toString("hex"), expiresAt = new Date(Date.now() + 7 * 86400000);
    const row = await tx.workspaceInvitation.create({ data: { workspaceId: session.workspaceId, createdById: session.userId, email, role, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt } });
    await audit(tx, session, "WorkspaceInvitation", row.id, email, null, { email, role, status: "PENDING", expiresAt: expiresAt.toISOString() });
    return ok({ id: row.id, token, email, expiresAt: expiresAt.toISOString() });
  });
}
/** Revoke a captured invitation version; accepted invitations cannot change membership retrospectively. */
export async function deleteInvitation(input: { id: string; version: number }): Promise<Result<true>> {
  const parsed = inviteVersionSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Check the invitation and current version");
  return withSettingsMutation(async (tx, session) => {
    const row = await tx.workspaceInvitation.findUnique({ where: { id_workspaceId: { id: parsed.data.id, workspaceId: session.workspaceId } } });
    if (!row) return err("NOT_FOUND", "Invitation not found");
    if (row.version !== parsed.data.version || row.status !== "PENDING") return err("CONFLICT", "The invitation has changed. Reload the list");
    if (row.role === "SUPER_ADMIN" && session.role !== "SUPER_ADMIN") return err("FORBIDDEN", "Only a super administrator can manage super administrators");
    await tx.workspaceInvitation.update({ where: { id: row.id, version: row.version }, data: { status: "REVOKED", version: { increment: 1 } } });
    await audit(tx, session, "WorkspaceInvitation", row.id, row.email, { status: row.status, role: row.role }, { status: "REVOKED", role: row.role });
    return ok(true as const);
  });
}
/** Redeem a valid invitation once; existing accounts must prove their current password and retain their profile. */
export async function createInvitedMembership(input: AcceptInviteInput): Promise<Result<{ email: string }>> {
  const parsed = acceptInviteSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Check your name, password, and invitation");
  const data = parsed.data;
  try {
    return await db.$transaction(async (tx) => {
      const invite = await tx.workspaceInvitation.findUnique({ where: { tokenHash: createHash("sha256").update(data.token).digest("hex") }, include: { createdBy: { include: { user: { select: { isActive: true } } } } } });
      if (!invite || invite.status !== "PENDING" || invite.expiresAt <= new Date() || !invite.createdBy.isActive || !invite.createdBy.user.isActive || !hasPermission(invite.createdBy.role, "canManageUsers") || (invite.role === "SUPER_ADMIN" && invite.createdBy.role !== "SUPER_ADMIN")) return err("NOT_FOUND", "This invitation is unavailable or has expired");
      let user = await tx.user.findUnique({ where: { email: invite.email } });
      if (user) {
        const verified = verifyPassword(data.password, user.passwordHash);
        if (!user.isActive || !verified.ok || !verified.data) return err("UNAUTHORIZED", "The password is incorrect or the account is disabled");
      } else {
        if (data.name.length < 2 || data.password.length < 12) return err("VALIDATION", "Enter your name and a password of at least 12 characters");
        const hash = hashPassword(data.password); if (!hash.ok) return hash;
        user = await tx.user.create({ data: { email: invite.email, name: data.name, passwordHash: hash.data, role: "READONLY" } });
      }
      if (await tx.membership.findUnique({ where: { userId_workspaceId: { userId: user.id, workspaceId: invite.workspaceId } } })) return err("CONFLICT", "You already belong to this workspace. Ask an administrator to reactivate access if needed");
      await tx.membership.create({ data: { userId: user.id, workspaceId: invite.workspaceId, role: invite.role } });
      await tx.workspaceInvitation.update({ where: { id: invite.id, version: invite.version }, data: { status: "ACCEPTED", acceptedAt: new Date(), version: { increment: 1 } } });
      await audit(tx, { userId: user.id, workspaceId: invite.workspaceId, name: user.name }, "Membership", user.id, invite.email, null, { role: invite.role, isActive: true, invitationId: invite.id });
      await audit(tx, { userId: user.id, workspaceId: invite.workspaceId, name: user.name }, "WorkspaceInvitation", invite.id, invite.email, { status: "PENDING", version: invite.version }, { status: "ACCEPTED", version: invite.version + 1 });
      return ok({ email: invite.email });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
  } catch (error: unknown) { return getSettingsError(error); }
}
