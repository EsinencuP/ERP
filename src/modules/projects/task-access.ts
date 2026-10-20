import "server-only";
import { authorize, getSession } from "@/lib/auth";
import { err } from "@/lib/errors";
import { Prisma } from "@prisma/client";

/** Resolve live membership and shared Projects RBAC; normalized tasks never fall back to demo documents. */
export async function getTaskContext(operation: "read" | "create" | "update" | "delete" = "read") {
  const session = await getSession(); if (!session.ok) return session;
  if (operation !== "read") { const allowed = authorize(session.data, "projects", operation); if (!allowed.ok) return allowed; }
  return session.data.demo ? err("CONFIGURATION", "Задачи требуют PostgreSQL и реального входа. Прежний реестр доступен отдельно") : session;
}
/** Return safe Projects storage failures and version conflicts. */
export function getTaskError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2003", "P2025", "P2034"].includes(error.code)) return err("CONFLICT", "Проект, задача или связанные записи изменились. Обновите данные; код проекта должен быть уникальным");
  return err("STORAGE", "Не удалось выполнить операцию Projects. Проверьте PostgreSQL и миграции");
}
