import type { Product as ProductRecord, Warehouse as WarehouseRecord, StockMovement as MovementRecord } from "@prisma/client";
import { getStockStatus } from "./stock";
import type { Product, Warehouse, StockMovement } from "./types";

/** Serialize normalized product money and aggregate quantities exactly. */
export function toProduct(row: ProductRecord, stock: string): Product {
  const minStock = row.minStock.toFixed(3);
  return { ...row, salePrice: row.salePrice.toFixed(0), costPrice: row.costPrice.toFixed(0), minStock, stock, stockStatus: getStockStatus(stock, minStock), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
/** Serialize a warehouse's versioned catalog fields. */
export function toWarehouse(row: WarehouseRecord): Warehouse { return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }; }
/** Serialize an immutable ledger entry with exact signed quantities and its warehouse identity. */
export function toStockMovement(row: MovementRecord, productId: string, warehouse: Pick<WarehouseRecord, "id" | "name" | "code">): StockMovement {
  return { id: row.id, workspaceId: row.workspaceId, productId, warehouseId: warehouse.id, warehouseName: warehouse.name, warehouseCode: warehouse.code, type: row.type, quantity: row.quantity.toFixed(3), qtyBefore: row.qtyBefore.toFixed(3), qtyAfter: row.qtyAfter.toFixed(3), transferId: row.transferId, reference: row.reference, notes: row.notes, createdById: row.createdById, createdAt: row.createdAt.toISOString() };
}
