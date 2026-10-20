import "server-only";
import { Prisma } from "@prisma/client";
import { err } from "@/lib/errors";

/** Map storage errors to safe HR outcomes without exposing personal or database details. */
export function getHrError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = error.meta?.target;
    return err("CONFLICT", Array.isArray(target) && target.includes("year") ? "Годовой лимит уже назначен. Обновите профиль" : "Табельный номер уже используется в этом рабочем пространстве");
  }
  return error instanceof Prisma.PrismaClientKnownRequestError && ["P2003", "P2025", "P2034"].includes(error.code) ? err("CONFLICT", "Данные сотрудника или связанные записи изменились. Обновите каталог") : err("STORAGE", "Не удалось выполнить операцию HR. Проверьте PostgreSQL и миграции");
}
