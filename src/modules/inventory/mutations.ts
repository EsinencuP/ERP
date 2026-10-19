import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { err } from "@/lib/errors";
import type { Result, SessionContext } from "@/types/shared";
import { getInventoryContext } from "./access";
import { getInventoryError } from "./errors";

/** Commit an authorized inventory aggregate serializably; retry only a guaranteed P2034 rollback. */
export async function withInventoryMutation<T>(operation: "create" | "update" | "delete", handleMutation: (tx: Prisma.TransactionClient, session: SessionContext) => Promise<Result<T>>): Promise<Result<T>> {
  const context = await getInventoryContext(operation); if (!context.ok) return context;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await db.$transaction((tx) => handleMutation(tx, context.data), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 }); }
    catch (error: unknown) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue; return getInventoryError(error); }
  }
  return err("CONFLICT", "Обновите склад перед повтором");
}
