import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import type { Result } from "@/types/shared";
import { getInventoryContext } from "./access";
import { getInventoryError } from "./errors";
import { getInventoryStockFacts, getProducts } from "./queries";
import { inventoryDashboardFiltersSchema } from "./schema";
import type { InventoryDashboardData, InventoryDashboardFilters } from "./types";

type SummaryRow = { currency: string; totalProducts: number; lowStockCount: number; outOfStock: number; amount: Prisma.Decimal };

/** Read global active-product KPIs and a bounded replenishment list in parallel, preserving currency and quantity precision. */
export async function getInventoryDashboard(filters: InventoryDashboardFilters = {}): Promise<Result<InventoryDashboardData>> {
  const context = await getInventoryContext(); if (!context.ok) return context;
  const parsed = inventoryDashboardFiltersSchema.safeParse(filters); if (!parsed.success) return err("VALIDATION", "Проверьте фильтры складского обзора");
  const data = parsed.data, asOf = new Date();
  try {
    const [summary, alerts] = await Promise.all([
      db.$queryRaw<SummaryRow[]>(Prisma.sql`${getInventoryStockFacts(context.data.workspaceId)}
        SELECT currency, COUNT(*)::int AS "totalProducts",
          COUNT(*) FILTER (WHERE "stockStatus" = 'low_stock')::int AS "lowStockCount",
          COUNT(*) FILTER (WHERE "stockStatus" = 'out_of_stock')::int AS "outOfStock",
          COALESCE(SUM(round(stock * "salePrice", 0)), 0) AS amount
        FROM facts WHERE "isActive" GROUP BY currency ORDER BY currency ASC`),
      getProducts({ page: data.page, pageSize: data.pageSize, search: data.search, active: "active", stockStatus: data.stockStatus ?? "attention" }),
    ]);
    if (!alerts.ok) return alerts;
    return ok({
      asOf: asOf.toISOString(),
      kpis: { totalProducts: summary.reduce((sum, row) => sum + row.totalProducts, 0), lowStockCount: summary.reduce((sum, row) => sum + row.lowStockCount, 0), outOfStock: summary.reduce((sum, row) => sum + row.outOfStock, 0), totalValues: summary.map((row) => ({ currency: row.currency, amount: row.amount.toFixed(0) })) },
      alerts: alerts.data,
    });
  } catch (error: unknown) { return getInventoryError(error); }
}
