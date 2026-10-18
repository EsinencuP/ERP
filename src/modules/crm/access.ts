import "server-only";
import { authorize, getSession } from "@/lib/auth";
import { err } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import type { Result, SessionContext } from "@/types/shared";

/** Resolve Auth.js through the shared Result boundary and require real tenant storage. */
export async function getCrmContext(operation: "read" | "create" | "update" | "delete" = "read"): Promise<Result<SessionContext>> {
  const session = await getSession();
  if (!session.ok) return session;
  if (!hasPermission(session.data.role, "canViewAll")) return err("FORBIDDEN", "Нет доступа к CRM");
  if (operation !== "read") {
    const permitted = authorize(session.data, "crm", operation);
    if (!permitted.ok) return permitted;
  }
  if (session.data.demo) return err("CONFIGURATION", "Contact/Deal/Activity требуют PostgreSQL и реального входа. Отключите ERP_DEMO_MODE");
  return session;
}
