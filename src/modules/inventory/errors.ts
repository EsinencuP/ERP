import "server-only";
import { Prisma } from "@prisma/client";
import { err } from "@/lib/errors";

/** Return safe inventory conflicts and storage failures without disclosing database internals. */
export function getInventoryError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return err("CONFLICT", "SKU товара или код склада уже используется в этом рабочем пространстве");
  return error instanceof Prisma.PrismaClientKnownRequestError && ["P2003", "P2025", "P2034"].includes(error.code) ? err("CONFLICT", "Данные изменились или товар связан с другими записями. Обновите каталог") : err("STORAGE", "Не удалось выполнить операцию склада. Проверьте PostgreSQL и миграции");
}
