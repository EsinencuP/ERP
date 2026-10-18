import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { User } from "next-auth";
import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import { verifyPassword } from "@/lib/password";
import type { Result, SessionContext } from "@/types/shared";

export const loginSchema = z.object({ email: z.string().trim().email().max(200), password: z.string().min(1).max(200) });
export const SESSION_MAX_AGE = 12 * 60 * 60;
const dummyHash = `${"0".repeat(32)}:${"0".repeat(128)}`;

/** Return whether this installation explicitly opts into public local demo access. */
export function isDemoMode(): boolean { return process.env.ERP_DEMO_MODE === "true"; }

/** Shared explicit demo identity; never returned after a PostgreSQL failure. */
export function getDemoSession(): SessionContext {
  return { workspaceId: "demo-workspace", workspaceName: "Evo Studio", userId: "demo-admin", name: "Александр Волков", email: "alex@demo.example", role: "ADMIN", demo: true, expires: "2099-01-01T00:00:00.000Z" };
}

/** Require a configured deployment secret rather than silently generating a signing key. */
export function hasAuthSecret(): boolean { return Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET); }

/** Verify credentials and register a fixed-lifetime revocable JWT session in the chosen membership. */
export async function getCredentialUser(input: unknown): Promise<Result<User>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return err("VALIDATION", "Введите корректный email и пароль");
  if (isDemoMode()) return err("UNAUTHORIZED", "В деморежиме используйте кнопку входа в демопространство");
  try {
    const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() }, include: { memberships: { where: { isActive: true }, orderBy: { workspaceId: "asc" }, take: 1, include: { workspace: true } } } });
    const verified = verifyPassword(parsed.data.password, user?.passwordHash ?? dummyHash);
    const member = user?.memberships[0];
    if (!user?.isActive || !member || !verified.ok || !verified.data) return err("UNAUTHORIZED", "Неверный email или пароль либо доступ отключён");
    const sessionId = createHash("sha256").update(randomBytes(32)).digest("hex");
    await db.session.create({ data: { tokenHash: sessionId, userId: user.id, workspaceId: member.workspaceId, expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000) } });
    return ok({ id: user.id, name: user.name, email: user.email, image: user.avatar, role: member.role, workspaceId: member.workspaceId, workspaceName: member.workspace.name, sessionId });
  } catch { return err("STORAGE", "Сервис входа недоступен. Проверьте подключение к PostgreSQL"); }
}

/** Re-read membership and role for every JWT access; client updates cannot choose identity or tenant. */
export async function getSessionIdentity(claims: { id?: string; workspaceId?: string; sessionId?: string }): Promise<Result<SessionContext>> {
  if (!claims.id || !claims.workspaceId || !claims.sessionId) return err("UNAUTHORIZED", "Войдите в рабочее пространство");
  try {
    const session = await db.session.findUnique({ where: { tokenHash: claims.sessionId }, include: { user: true, membership: { include: { workspace: true } } } });
    if (!session || session.expiresAt <= new Date() || session.userId !== claims.id || session.workspaceId !== claims.workspaceId || !session.user.isActive) return err("UNAUTHORIZED", "Сессия истекла или доступ отключён. Войдите снова");
    if (!session.membership.isActive) return err("FORBIDDEN", "Нет доступа к рабочему пространству");
    return ok({ userId: session.userId, name: session.user.name, email: session.user.email, role: session.membership.role, workspaceId: session.workspaceId, workspaceName: session.membership.workspace.name, demo: false, expires: session.expiresAt.toISOString() });
  } catch { return err("STORAGE", "Сервис авторизации недоступен. Проверьте подключение к PostgreSQL"); }
}

/** Revoke the current verified JWT before cookie removal; storage failure leaves logout retryable. */
export async function deleteCurrentSession(): Promise<Result<true>> {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) return err("CONFIGURATION", "Задайте AUTH_SECRET");
  try {
    const requestHeaders = await headers();
    for (const cookieName of ["authjs.session-token", "__Secure-authjs.session-token"]) {
      const token = await getToken({ req: { headers: requestHeaders }, secret, cookieName });
      if (token?.sessionId) await db.session.deleteMany({ where: { tokenHash: token.sessionId } });
    }
    return ok(true);
  } catch { return err("STORAGE", "Не удалось отозвать сессию. Повторите выход"); }
}
