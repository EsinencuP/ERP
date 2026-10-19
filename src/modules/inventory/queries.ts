import "server-only";
import { Prisma, type Product as ProductRecord } from "@prisma/client";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import type { PaginatedResponse, Result } from "@/types/shared";
import { getInventoryContext } from "./access";
import { getInventoryError } from "./errors";
import { productFiltersSchema, productIdSchema } from "./schema";
import { toProduct } from "./serializers";
import { inventoryTextMatch } from "./search";
import type { InventoryStockAlert, Product, ProductFilters } from "./types";

/** Build the shared tenant-scoped physical stock facts used by catalog, alerts and dashboard aggregates. */
export function getInventoryStockFacts(workspaceId: string) {
  return Prisma.sql`WITH balances AS (
    SELECT "productId", SUM(qty) AS qty FROM "StockItem" WHERE "workspaceId" = ${workspaceId} GROUP BY "productId"
  ), facts AS (
    SELECT p.*, COALESCE(b.qty, 0) AS stock,
      CASE WHEN COALESCE(b.qty, 0) = 0 THEN 'out_of_stock' WHEN b.qty <= p."minStock" THEN 'low_stock' ELSE 'in_stock' END AS "stockStatus"
    FROM "Product" p LEFT JOIN balances b ON b."productId" = p.id WHERE p."workspaceId" = ${workspaceId}
  )`;
}

/** Read a bounded product page with exact stock summed over every warehouse in the current workspace. */
export async function getProducts(filters: ProductFilters = {}): Promise<Result<PaginatedResponse<Product>>> {
  const context = await getInventoryContext(); if (!context.ok) return context;
  const parsed = productFiltersSchema.safeParse(filters); if (!parsed.success) return err("VALIDATION", "Проверьте фильтры каталога");
  const data = parsed.data, facts = getInventoryStockFacts(context.data.workspaceId);
  const conditions = [Prisma.sql`TRUE`];
  if (data.active !== "all") conditions.push(Prisma.sql`p."isActive" = ${data.active === "active"}`);
  if (data.search) conditions.push(inventoryTextMatch(Prisma.sql`p.sku || ' ' || p.name || ' ' || COALESCE(p.category, '')`, data.search));
  if (data.category !== undefined) conditions.push(Prisma.sql`COALESCE(p.category, '') = ${data.category}`);
  if (data.stockStatus) conditions.push(data.stockStatus === "attention" ? Prisma.sql`p.stock <= p."minStock"` : Prisma.sql`p."stockStatus" = ${data.stockStatus}`);
  const where = Prisma.join(conditions, " AND ");
  try {
    const [rows, counts] = await Promise.all([
      db.$queryRaw<(ProductRecord & { stock: Prisma.Decimal })[]>(Prisma.sql`${facts} SELECT p.* FROM facts p WHERE ${where} ORDER BY p.sku ASC, p.id ASC LIMIT ${data.pageSize} OFFSET ${(data.page - 1) * data.pageSize}`),
      db.$queryRaw<{ total: number }[]>(Prisma.sql`${facts} SELECT COUNT(*)::int AS total FROM facts p WHERE ${where}`),
    ]);
    const total = counts[0]?.total ?? 0;
    return ok({ data: rows.map((row) => toProduct(row, row.stock.toFixed(3))), total, page: data.page, pageSize: data.pageSize, totalPages: Math.ceil(total / data.pageSize) });
  } catch (error: unknown) { return getInventoryError(error); }
}

/** Read one product with its total stock without accepting a caller-supplied tenant. */
export async function getProduct(id: string): Promise<Result<Product>> {
  const context = await getInventoryContext(); if (!context.ok) return context;
  if (!productIdSchema.safeParse(id).success) return err("VALIDATION", "Неверный ID товара");
  try {
    const rows = await db.$queryRaw<(ProductRecord & { stock: Prisma.Decimal })[]>(Prisma.sql`${getInventoryStockFacts(context.data.workspaceId)} SELECT p.* FROM facts p WHERE p.id = ${id}`);
    const row = rows[0]; return row ? ok(toProduct(row, row.stock.toFixed(3))) : err("NOT_FOUND", "Товар не найден");
  } catch (error: unknown) { return getInventoryError(error); }
}

/** Count active products needing replenishment globally, including zero stock and products without warehouse rows. */
export async function getInventoryStockAlert(): Promise<Result<InventoryStockAlert>> {
  const context = await getInventoryContext(); if (!context.ok) return context;
  try {
    const rows = await db.$queryRaw<InventoryStockAlert[]>(Prisma.sql`${getInventoryStockFacts(context.data.workspaceId)}
      SELECT COUNT(*) FILTER (WHERE "stockStatus" = 'low_stock')::int AS "lowStock",
        COUNT(*) FILTER (WHERE "stockStatus" = 'out_of_stock')::int AS "outOfStock",
        COUNT(*)::int AS total FROM facts WHERE "isActive" AND stock <= "minStock"`);
    return ok(rows[0] ?? { lowStock: 0, outOfStock: 0, total: 0 });
  } catch (error: unknown) { return getInventoryError(error); }
}
