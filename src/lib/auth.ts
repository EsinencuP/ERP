import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { failure, success } from "@/lib/errors";
import type { Domain, Result, SessionContext } from "@/types/shared";

/** Return whether this installation explicitly opts into local demo access. */
export function isDemoMode(): boolean { return process.env.ERP_DEMO_MODE === "true"; }

/** Resolve tenant and role from a server-owned session, never from client input. */
export async function getSession(): Promise<Result<SessionContext>> {
  if (isDemoMode()) return success({ workspaceId: "demo-workspace", workspaceName: "Evo Studio", userId: "demo-admin", name: "Александр Волков", email: "alex@demo.example", role: "ADMIN", demo: true });
  try {
    const token = (await cookies()).get("erp_session")?.value;
    if (!token) return failure("UNAUTHORIZED", "Войдите в рабочее пространство");
    const session = await db.session.findUnique({ where: { tokenHash: createHash("sha256").update(token).digest("hex") }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) return failure("UNAUTHORIZED", "Сессия истекла. Войдите снова");
    const membership = await db.membership.findUnique({ where: { userId_workspaceId: { userId: session.userId, workspaceId: session.workspaceId } }, include: { workspace: true } });
    if (!membership) return failure("FORBIDDEN", "Нет доступа к рабочему пространству");
    return success({ workspaceId: membership.workspaceId, workspaceName: membership.workspace.name, userId: session.user.id, name: session.user.name, email: session.user.email, role: membership.role, demo: false });
  } catch { return failure("STORAGE", "Сервис авторизации недоступен. Проверьте подключение к PostgreSQL"); }
}

/** Enforce the template's default write policy at the service boundary. */
export function authorize(session: SessionContext, domain: Domain, operation: "create" | "update" | "delete"): Result<true> {
  if (session.role === "VIEWER" || (session.role === "MANAGER" && domain === "hr" && operation === "delete")) return failure("FORBIDDEN", "Недостаточно прав для этого действия");
  return success(true);
}
