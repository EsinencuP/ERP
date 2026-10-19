import "server-only";
import { Prisma, type Warehouse as WarehouseRecord } from "@prisma/client";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import type { PaginatedResponse, Result } from "@/types/shared";
import { getInventoryContext } from "./access";
import { getInventoryError } from "./errors";
import { warehouseFiltersSchema } from "./schema";
import { toWarehouse } from "./serializers";
import { inventoryTextMatch } from "./search";
import type { Warehouse, WarehouseFilters } from "./types";

/** Read a bounded tenant warehouse catalog for management and movement selection. */
export async function getWarehouses(filters: WarehouseFilters = {}): Promise<Result<PaginatedResponse<Warehouse>>> {
  const context = await getInventoryContext(); if (!context.ok) return context;
  const parsed = warehouseFiltersSchema.safeParse(filters); if (!parsed.success) return err("VALIDATION", "Проверьте фильтры складов");
  const data = parsed.data;
  const conditions = [Prisma.sql`w."workspaceId" = ${context.data.workspaceId}`];
  if (data.active !== "all") conditions.push(Prisma.sql`w."isActive" = ${data.active === "active"}`);
  if (data.search) conditions.push(inventoryTextMatch(Prisma.sql`w.code || ' ' || w.name`, data.search));
  const where = Prisma.join(conditions, " AND ");
  try {
    const [rows, counts] = await Promise.all([db.$queryRaw<WarehouseRecord[]>(Prisma.sql`SELECT w.* FROM "Warehouse" w WHERE ${where} ORDER BY w.code ASC, w.id ASC LIMIT ${data.pageSize} OFFSET ${(data.page - 1) * data.pageSize}`), db.$queryRaw<{ total: number }[]>(Prisma.sql`SELECT COUNT(*)::int AS total FROM "Warehouse" w WHERE ${where}`)]);
    const total = counts[0]?.total ?? 0;
    return ok({ data: rows.map(toWarehouse), total, page: data.page, pageSize: data.pageSize, totalPages: Math.ceil(total / data.pageSize) });
  } catch (error: unknown) { return getInventoryError(error); }
}
