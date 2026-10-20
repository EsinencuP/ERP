import "server-only";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import { sqlTextMatch } from "@/lib/sql-search";
import type { PaginatedResponse, Result } from "@/types/shared";
import { getSettingsContext, getSettingsError } from "./access";
import { invitationTokenSchema, memberFiltersSchema } from "./schema";
import type { AuditEntry, Invitation, InvitationPreview, MemberFilters, WorkspaceMember } from "./types";

/** Read a bounded, tenant-only member directory without password or session fields. */
export async function getMembers(input: MemberFilters = {}): Promise<Result<PaginatedResponse<WorkspaceMember>>> {
  const context = await getSettingsContext(); if (!context.ok) return context;
  const parsed = memberFiltersSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Check the member filters");
  const { search, page, role, status } = parsed.data;
  const filter = Prisma.sql`WHERE m."workspaceId" = ${context.data.workspaceId}
    ${role ? Prisma.sql`AND m.role::text = ${role}` : Prisma.empty}
    ${status === "active" ? Prisma.sql`AND m."isActive" AND u."isActive"` : status === "inactive" ? Prisma.sql`AND (NOT m."isActive" OR NOT u."isActive")` : Prisma.empty}
    ${search ? Prisma.sql`AND ${sqlTextMatch(Prisma.sql`u.name || ' ' || u.email`, search)}` : Prisma.empty}`;
  try {
    const [rows, counts] = await db.$transaction([
      db.$queryRaw<(Omit<WorkspaceMember, "lastLoginAt"> & { lastLoginAt: Date | null })[]>(Prisma.sql`SELECT m."userId", m.role, m."isActive", m.version, m."lastLoginAt", u.name, u.email, u.avatar, u."isActive" AS "accountActive" FROM "Membership" m JOIN "User" u ON u.id = m."userId" ${filter} ORDER BY u.name, m."userId" LIMIT 20 OFFSET ${(page - 1) * 20}`),
      db.$queryRaw<{ total: number }[]>(Prisma.sql`SELECT count(*)::int AS total FROM "Membership" m JOIN "User" u ON u.id = m."userId" ${filter}`),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    const total = counts[0]?.total ?? 0;
    return ok({ data: rows.map((row) => ({ ...row, lastLoginAt: row.lastLoginAt?.toISOString() ?? null })), total, page, pageSize: 20, totalPages: Math.ceil(total / 20) });
  } catch (error: unknown) { return getSettingsError(error); }
}
/** Read the latest twenty invitations; secret token hashes never leave the server. */
export async function getInvitations(): Promise<Result<Invitation[]>> {
  const context = await getSettingsContext(); if (!context.ok) return context;
  try { const rows = await db.workspaceInvitation.findMany({ where: { workspaceId: context.data.workspaceId }, select: { id: true, email: true, role: true, status: true, expiresAt: true, createdAt: true, version: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20 }); return ok(rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString() }))); }
  catch (error: unknown) { return getSettingsError(error); }
}
/** Remove secret-shaped fields and bound the depth/size of audit snapshots before sending them to the browser. */
export function sanitizeAudit(value: unknown, depth = 0): unknown {
  if (depth > 6) return "…";
  if (typeof value === "string") return value.slice(0, 4000);
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeAudit(item, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !/password|secret|token|hash/i.test(key)).slice(0, 100).map(([key, item]) => [key, sanitizeAudit(item, depth + 1)]));
  return value;
}
/** Return exactly the latest hundred tenant events to ADMIN+, with sanitized change snapshots. */
export async function getAuditLog(): Promise<Result<AuditEntry[]>> {
  const context = await getSettingsContext(); if (!context.ok) return context;
  try { const rows = await db.auditLog.findMany({ where: { workspaceId: context.data.workspaceId }, select: { id: true, actor: true, domain: true, action: true, title: true, entityType: true, createdAt: true, before: true, after: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100 }); return ok(rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), before: sanitizeAudit(row.before), after: sanitizeAudit(row.after) }))); }
  catch (error: unknown) { return getSettingsError(error); }
}
/** Preview a high-entropy, unexpired invitation; no cookie/session grants access from this read. */
export async function getInvitationPreview(token: string): Promise<Result<InvitationPreview>> {
  if (!invitationTokenSchema.safeParse(token).success) return err("NOT_FOUND", "This invitation is unavailable or has expired");
  try {
    const row = await db.workspaceInvitation.findUnique({ where: { tokenHash: createHash("sha256").update(token).digest("hex") }, include: { workspace: { select: { name: true } }, createdBy: { include: { user: { select: { isActive: true } } } } } });
    if (!row || row.status !== "PENDING" || row.expiresAt <= new Date() || !row.createdBy.isActive || !row.createdBy.user.isActive || !hasPermission(row.createdBy.role, "canManageUsers") || (row.role === "SUPER_ADMIN" && row.createdBy.role !== "SUPER_ADMIN")) return err("NOT_FOUND", "This invitation is unavailable or has expired");
    const user = await db.user.findUnique({ where: { email: row.email }, select: { id: true } });
    return ok({ email: row.email, role: row.role, workspaceName: row.workspace.name, existingAccount: Boolean(user), expiresAt: row.expiresAt.toISOString() });
  } catch (error: unknown) { return getSettingsError(error); }
}
