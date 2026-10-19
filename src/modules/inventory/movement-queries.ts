import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import type { PaginatedResponse, Result } from "@/types/shared";
import { getInventoryContext } from "./access";
import { getInventoryError } from "./errors";
import { productIdSchema, movementFiltersSchema } from "./schema";
import { toStockMovement } from "./serializers";
import { getProduct } from "./queries";
import { z } from "zod";
import type { MovementFilters, StockMovement, StockPosition, ProductInventory } from "./types";

/** Read a warehouse position and opening version; version zero means no StockItem exists yet. */
export async function getStockPosition(productId: string, warehouseId: string): Promise<Result<StockPosition>> {
  const context = await getInventoryContext(); if (!context.ok) return context;
  if (!productIdSchema.safeParse(productId).success || !productIdSchema.safeParse(warehouseId).success) return err("VALIDATION", "Выберите товар и склад");
  const workspaceId = context.data.workspaceId;
  try {
    const [product, warehouse, row] = await Promise.all([db.product.findUnique({ where: { id_workspaceId: { id: productId, workspaceId } }, select: { id: true } }), db.warehouse.findUnique({ where: { id_workspaceId: { id: warehouseId, workspaceId } } }), db.stockItem.findUnique({ where: { workspaceId_productId_warehouseId: { workspaceId, productId, warehouseId } } })]);
    if (!product || !warehouse) return err("NOT_FOUND", "Товар или склад не найден");
    return ok({ productId, warehouseId, warehouseName: warehouse.name, warehouseCode: warehouse.code, warehouseActive: warehouse.isActive, qty: row?.qty.toFixed(3) ?? "0.000", version: row?.version ?? 0 });
  } catch (error: unknown) { return getInventoryError(error); }
}

/** Read existing per-warehouse balances, including inactive locations, without creating missing rows. */
export async function getProductStockPositions(productId: string, page = 1): Promise<Result<PaginatedResponse<StockPosition>>> {
  const context = await getInventoryContext(); if (!context.ok) return context;
  if (!productIdSchema.safeParse(productId).success || !z.number().int().min(1).max(1000000).safeParse(page).success) return err("VALIDATION", "Проверьте товар и страницу остатков");
  const workspaceId = context.data.workspaceId;
  try {
    if (!await db.product.findUnique({ where: { id_workspaceId: { id: productId, workspaceId } }, select: { id: true } })) return err("NOT_FOUND", "Товар не найден");
    const where = { workspaceId, productId };
    const [rows, total] = await Promise.all([db.stockItem.findMany({ where, include: { warehouse: true }, orderBy: [{ warehouse: { code: "asc" } }, { id: "asc" }], skip: (page - 1) * 20, take: 20 }), db.stockItem.count({ where })]);
    return ok({ data: rows.map((row) => ({ productId, warehouseId: row.warehouseId, warehouseName: row.warehouse.name, warehouseCode: row.warehouse.code, warehouseActive: row.warehouse.isActive, qty: row.qty.toFixed(3), version: row.version })), total, page, pageSize: 20, totalPages: Math.ceil(total / 20) });
  } catch (error: unknown) { return getInventoryError(error); }
}

/** Refresh product totals, warehouse positions and ledger in parallel with independent live tenant checks. */
export async function getProductInventory(productId: string, filters: MovementFilters = {}, positionsPage = 1): Promise<Result<ProductInventory>> {
  const [product, ledger, positions] = await Promise.all([getProduct(productId), getProductMovements(productId, filters), getProductStockPositions(productId, positionsPage)]);
  if (!product.ok) return product; if (!ledger.ok) return ledger; if (!positions.ok) return positions;
  return ok({ product: product.data, ledger: ledger.data, positions: positions.data });
}

/** Read a product's immutable ledger in stable chronological order with bounded pagination. */
export async function getProductMovements(productId: string, filters: MovementFilters = {}): Promise<Result<PaginatedResponse<StockMovement>>> {
  const context = await getInventoryContext(); if (!context.ok) return context;
  const parsed = movementFiltersSchema.safeParse(filters); if (!productIdSchema.safeParse(productId).success || !parsed.success) return err("VALIDATION", "Проверьте товар и фильтры движений");
  const workspaceId = context.data.workspaceId, data = parsed.data;
  try {
    if (!await db.product.findUnique({ where: { id_workspaceId: { id: productId, workspaceId } }, select: { id: true } })) return err("NOT_FOUND", "Товар не найден");
    const where: Prisma.StockMovementWhereInput = { workspaceId, stockItem: { workspaceId, productId }, ...(data.type ? { type: data.type === "TRANSFER" ? { in: ["TRANSFER_IN", "TRANSFER_OUT"] } : data.type } : {}) };
    const [rows, total] = await Promise.all([db.stockMovement.findMany({ where, include: { stockItem: { include: { warehouse: true } } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (data.page - 1) * data.pageSize, take: data.pageSize }), db.stockMovement.count({ where })]);
    return ok({ data: rows.map((row) => toStockMovement(row, productId, row.stockItem.warehouse)), total, page: data.page, pageSize: data.pageSize, totalPages: Math.ceil(total / data.pageSize) });
  } catch (error: unknown) { return getInventoryError(error); }
}
