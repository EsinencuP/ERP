import "server-only";
import { authorize, getSession } from "@/lib/auth";
import { err } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import type { Result, SessionContext } from "@/types/shared";

/** Require a live workspace membership and the existing HR permission policy. */
export async function getHrContext(operation: "read" | "create" | "update" | "delete" = "read"): Promise<Result<SessionContext>> {
  const context = await getSession(); if (!context.ok) return context;
  if (!hasPermission(context.data.role, "canViewAll")) return err("FORBIDDEN", "Нет доступа к сотрудникам");
  if (operation !== "read") { const permission = authorize(context.data, "hr", operation); if (!permission.ok) return permission; }
  if (context.data.demo) return err("CONFIGURATION", "Каталог Employee требует PostgreSQL и реального входа. Прежний реестр доступен в отдельной вкладке");
  return context;
}
