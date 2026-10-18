import "server-only";
import { Prisma } from "@prisma/client";
import { err } from "@/lib/errors";
import type { Result } from "@/types/shared";

/** Translate driver conflicts without leaking SQL, exception messages or connection details. */
export function getCrmStorageError(error: unknown): Result<never> {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") return err("CONFLICT", "Связанная запись недоступна либо контакт используется другими документами");
    if (["P2002", "P2025", "P2034"].includes(error.code)) return err("CONFLICT", "Запись уже изменена, удалена или конфликтует с другой операцией. Обновите данные");
  }
  return err("STORAGE", "Не удалось выполнить операцию CRM. Проверьте PostgreSQL и миграции");
}
