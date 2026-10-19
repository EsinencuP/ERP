import "server-only";
import { Prisma } from "@prisma/client";
import { err } from "@/lib/errors";

/** Map storage failures to safe finance Results without exposing SQL or connection strings. */
export function getFinanceError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2003", "P2025", "P2034"].includes(error.code) ? err("CONFLICT", "Данные изменились либо связанная запись недоступна. Обновите данные") : err("STORAGE", "Не удалось выполнить операцию. Проверьте PostgreSQL и миграции");
}
