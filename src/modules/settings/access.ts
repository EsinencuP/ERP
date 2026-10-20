import "server-only";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import type { Result, SessionContext } from "@/types/shared";

/** Resolve the tenant from a live session and restrict member administration to ADMIN+. */
export async function getSettingsContext(): Promise<Result<SessionContext>> {
  const result = await getSession(); if (!result.ok) return result;
  if (!hasPermission(result.data.role, "canManageUsers")) return err("FORBIDDEN", "Only administrators can manage workspace members and audit logs");
  return result.data.demo ? err("CONFIGURATION", "Member administration requires PostgreSQL and a real sign-in") : result;
}
/** Recheck the actor inside the serializable mutation, including concurrent role/access changes. */
export async function getSettingsActor(tx: Prisma.TransactionClient, session: SessionContext): Promise<Result<SessionContext>> {
  const member = await tx.membership.findUnique({ where: { userId_workspaceId: { userId: session.userId, workspaceId: session.workspaceId } }, include: { user: { select: { isActive: true } } } });
  return member?.isActive && member.user.isActive && hasPermission(member.role, "canManageUsers") ? ok({ ...session, role: member.role }) : err("FORBIDDEN", "Your administrator access has changed. Reload the page");
}
/** Return safe storage/conflict outcomes without exposing database or invitation secrets. */
export function getSettingsError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2003", "P2025", "P2034"].includes(error.code) ? err("CONFLICT", "The record changed or an invitation already exists. Reload and try again") : err("STORAGE", "Settings could not be saved. Check PostgreSQL and try again");
}
/** Execute one atomic operation; serialization conflicts require an explicit refresh, never a silent retry. */
export async function withSettingsMutation<T>(operation: (tx: Prisma.TransactionClient, session: SessionContext) => Promise<Result<T>>): Promise<Result<T>> {
  const context = await getSettingsContext(); if (!context.ok) return context;
  try { return await db.$transaction(async (tx) => { const actor = await getSettingsActor(tx, context.data); return actor.ok ? operation(tx, actor.data) : actor; }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
  catch (error: unknown) { return getSettingsError(error); }
}
