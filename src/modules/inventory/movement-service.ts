import "server-only";
import { Prisma, type StockItem } from "@prisma/client";
import { err, ok } from "@/lib/errors";
import type { Result } from "@/types/shared";
import { withInventoryMutation } from "./mutations";
import { stockMovementSchema } from "./schema";
import { toStockMovement } from "./serializers";
import { milliToStock, stockDeltaToMilli, stockToMilli } from "./stock";
import type { StockMovementInput, StockMovementReceipt } from "./types";

/** Append a movement and update versioned balances atomically; transfers always create a matched immutable pair. */
export async function createStockMovement(input: StockMovementInput): Promise<Result<StockMovementReceipt>> {
  return withInventoryMutation("create", async (tx, session) => {
    const parsed = stockMovementSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Проверьте тип, количество, склады и версии остатков", { fields: parsed.error.flatten() });
    const data = parsed.data, workspaceId = session.workspaceId;
    const warehouseIds = data.type === "TRANSFER" ? [data.warehouseId, data.targetWarehouseId] : [data.warehouseId];
    const [product, warehouses, balances] = await Promise.all([
      tx.product.findUnique({ where: { id_workspaceId: { id: data.productId, workspaceId } } }),
      tx.warehouse.findMany({ where: { workspaceId, id: { in: warehouseIds } } }),
      tx.stockItem.findMany({ where: { workspaceId, productId: data.productId, warehouseId: { in: warehouseIds } } }),
    ]);
    if (!product || warehouses.length !== warehouseIds.length) return err("NOT_FOUND", "Товар или склад не найден");
    if (!product.isActive || warehouses.some((warehouse) => !warehouse.isActive)) return err("CONFLICT", "Движения доступны только для активных товаров и складов");
    const positions: { warehouseId: string; version: number; delta: bigint; type: "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER_IN" | "TRANSFER_OUT"; row: StockItem | undefined; before: bigint; after: bigint }[] = [];
    const quantity = stockDeltaToMilli(data.quantity), sourceDelta = data.type === "OUT" || data.type === "TRANSFER" ? -quantity : quantity;
    positions.push({ warehouseId: data.warehouseId, version: data.stockVersion, delta: sourceDelta, type: data.type === "TRANSFER" ? "TRANSFER_OUT" : data.type, row: undefined, before: 0n, after: 0n });
    if (data.type === "TRANSFER") positions.push({ warehouseId: data.targetWarehouseId, version: data.targetStockVersion, delta: quantity, type: "TRANSFER_IN", row: undefined, before: 0n, after: 0n });
    for (const position of positions) {
      position.row = balances.find((row) => row.warehouseId === position.warehouseId);
      if ((position.row?.version ?? 0) !== position.version) return err("CONFLICT", "Остаток изменился. Перечитайте оба склада перед повтором");
      position.before = stockToMilli(position.row?.qty.toFixed(3) ?? "0.000"); position.after = position.before + position.delta;
      if (position.after < 0n) return err("VALIDATION", "Недостаточно остатка для списания");
      if (position.after > 99999999999999999999n) return err("VALIDATION", "Остаток превышает допустимые 17 целых и 3 дробных знака");
    }
    const plans = [];
    for (const position of positions) { const warehouse = warehouses.find((item) => item.id === position.warehouseId); if (!warehouse) return err("NOT_FOUND", "Склад не найден"); plans.push({ ...position, warehouse }); }
    const transferId = data.type === "TRANSFER" ? crypto.randomUUID() : null, createdAt = new Date(), movements = [];
    for (const position of plans.sort((a, b) => a.warehouseId.localeCompare(b.warehouseId))) {
      const balance = position.row ? await tx.stockItem.update({ where: { id_workspaceId: { id: position.row.id, workspaceId }, version: position.version }, data: { qty: milliToStock(position.after), version: { increment: 1 } } }) : await tx.stockItem.create({ data: { workspaceId, productId: data.productId, warehouseId: position.warehouseId, qty: milliToStock(position.after) } });
      const row = await tx.stockMovement.create({ data: { workspaceId, stockItemId: balance.id, createdById: session.userId, type: position.type, quantity: milliToStock(position.delta), qtyBefore: milliToStock(position.before), qtyAfter: milliToStock(position.after), transferId, reference: data.reference || null, notes: data.notes || null, createdAt } });
      const movement = toStockMovement(row, data.productId, position.warehouse); movements.push(movement);
      await tx.auditLog.create({ data: { workspaceId, actorId: session.userId, actor: session.name, domain: "inventory", action: "created", entityType: "StockMovement", entityId: row.id, title: `${position.type} · ${product.sku}`, before: Prisma.DbNull, after: { ...movement, stockVersion: balance.version } } });
    }
    return ok({ transferId, movements });
  });
}
