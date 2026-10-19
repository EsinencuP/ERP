import "server-only";
import { Prisma } from "@prisma/client";
import { err, ok } from "@/lib/errors";
import type { Result, SessionContext } from "@/types/shared";
import { withInventoryMutation } from "./mutations";
import { productIdSchema, productVersionSchema, warehouseSchema } from "./schema";
import { toWarehouse } from "./serializers";
import type { Warehouse, WarehouseInput } from "./types";

async function getVersioned(tx: Prisma.TransactionClient, workspaceId: string, id: string, version: number) {
  if (!productIdSchema.safeParse(id).success || !productVersionSchema.safeParse(version).success) return err("VALIDATION", "Нужны ID и актуальная версия склада");
  const row = await tx.warehouse.findUnique({ where: { id_workspaceId: { id, workspaceId } } });
  if (!row) return err("NOT_FOUND", "Склад не найден");
  return row.version === version ? ok(row) : err("CONFLICT", "Склад изменён. Обновите данные");
}
async function audit(tx: Prisma.TransactionClient, session: SessionContext, action: "created" | "updated" | "deleted", warehouse: Warehouse, before: Warehouse | null) {
  await tx.auditLog.create({ data: { workspaceId: session.workspaceId, actorId: session.userId, actor: session.name, domain: "inventory", action, entityType: "Warehouse", entityId: warehouse.id, title: warehouse.name, before: before ? { ...before } : Prisma.DbNull, after: action === "deleted" ? Prisma.DbNull : { ...warehouse } } });
}
/** Create a workspace warehouse and its audit in one transaction. */
export async function createWarehouse(input: WarehouseInput): Promise<Result<Warehouse>> {
  return withInventoryMutation("create", async (tx, session) => {
    const parsed = warehouseSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Проверьте поля склада");
    const row = await tx.warehouse.create({ data: { ...parsed.data, workspaceId: session.workspaceId, address: parsed.data.address || null } }), result = toWarehouse(row);
    await audit(tx, session, "created", result, null); return ok(result);
  });
}
/** Update warehouse catalog fields after checking its opening version. */
export async function updateWarehouse(id: string, version: number, input: WarehouseInput): Promise<Result<Warehouse>> {
  return withInventoryMutation("update", async (tx, session) => {
    const current = await getVersioned(tx, session.workspaceId, id, version); if (!current.ok) return current;
    const parsed = warehouseSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Проверьте поля склада");
    const row = await tx.warehouse.update({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version }, data: { ...parsed.data, address: parsed.data.address || null, version: { increment: 1 } } }), result = toWarehouse(row);
    await audit(tx, session, "updated", result, toWarehouse(current.data)); return ok(result);
  });
}
/** Delete only an unused warehouse, retaining all balances and ledger history. */
export async function deleteWarehouse(id: string, version: number): Promise<Result<Warehouse>> {
  return withInventoryMutation("delete", async (tx, session) => {
    const current = await getVersioned(tx, session.workspaceId, id, version); if (!current.ok) return current;
    if (await tx.stockItem.count({ where: { workspaceId: session.workspaceId, warehouseId: id } })) return err("CONFLICT", "На складе есть складские записи. Деактивируйте его вместо удаления");
    await tx.warehouse.delete({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version } });
    const result = toWarehouse(current.data); await audit(tx, session, "deleted", result, result); return ok(result);
  });
}
