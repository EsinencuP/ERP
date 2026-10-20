import { getI18n } from "@/i18n/server";
import { EXPENSE_CATEGORY_LABELS } from "./presentation";
import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import type { Result } from "@/types/shared";
import { getFinanceContext } from "./access";
import { getFinanceError } from "./errors";
import { invoicePriceInput } from "./calculations";
import { EXPENSE_CATEGORIES, pnlFiltersSchema } from "./schema";
import { PNL_TIMEZONE } from "./report-periods";
import type { ExpenseCategory, PnlFilters, PnlReport } from "./types";

type ReportRow = { kind: "revenue" | "expense"; category: ExpenseCategory | null; amount: Prisma.Decimal; count: number };

async function readPnlReport(filters: PnlFilters, exporting: boolean): Promise<Result<PnlReport>> {
  const context = await getFinanceContext(); if (!context.ok) return context;
  if (exporting && !hasPermission(context.data.role, "canExport")) return err("FORBIDDEN", "Нет права на экспорт финансового отчёта");
  const parsed = pnlFiltersSchema.safeParse(filters);
  if (!parsed.success) return err("VALIDATION", "Укажите корректный период и валюту RUB, USD или EUR");
  const { from, to, currency } = parsed.data, { workspaceId } = context.data, asOf = new Date();
  try {
    // One statement gives revenue and expenses a common PostgreSQL snapshot. All money stays numeric/BigInt.
    const rows = await db.$queryRaw<ReportRow[]>`WITH payments AS (
      SELECT p."invoiceId", SUM(p.amount) AS amount, MAX(p."receivedAt") AS "paidAt"
      FROM invoice_payments p JOIN "Invoice" i ON i.id = p."invoiceId" AND i."workspaceId" = p."workspaceId"
      WHERE p."workspaceId" = ${workspaceId} AND i."workspaceId" = ${workspaceId} AND i.currency = ${currency}
        AND i.status::text NOT IN ('DRAFT', 'CANCELLED') AND p."receivedAt" <= ${asOf}
      GROUP BY p."invoiceId"
    )
    SELECT 'revenue' AS kind, NULL::text AS category, COALESCE(SUM(i.total), 0) AS amount, COUNT(*)::int AS count
    FROM "Invoice" i JOIN payments p ON p."invoiceId" = i.id
    WHERE i."workspaceId" = ${workspaceId} AND i.currency = ${currency}
      AND i.status::text NOT IN ('DRAFT', 'CANCELLED') AND i.total > 0 AND p.amount >= i.total
      AND (p."paidAt" AT TIME ZONE ${PNL_TIMEZONE})::date BETWEEN ${from}::date AND ${to}::date
    UNION ALL
    SELECT 'expense' AS kind, e.category::text AS category, SUM(e.amount) AS amount, COUNT(*)::int AS count
    FROM "Expense" e WHERE e."workspaceId" = ${workspaceId} AND e.currency = ${currency}
      AND e.date BETWEEN ${from}::date AND ${to}::date GROUP BY e.category`;
    const revenueRow = rows.find((row) => row.kind === "revenue"), revenue = revenueRow?.amount.toFixed(0) ?? "0";
    const categories = EXPENSE_CATEGORIES.map((category) => { const row = rows.find((item) => item.kind === "expense" && item.category === category); return { category, amount: row?.amount.toFixed(0) ?? "0", count: row?.count ?? 0 }; });
    const expenses = categories.reduce((sum, row) => sum + BigInt(row.amount), 0n);
    return ok({ from, to, currency, asOf: asOf.toISOString(), revenue, expenses: expenses.toString(), netProfit: (BigInt(revenue) - expenses).toString(), invoiceCount: revenueRow?.count ?? 0, expenseCount: categories.reduce((sum, row) => sum + row.count, 0), categories });
  } catch (error: unknown) { return getFinanceError(error); }
}

/** Read P&L: fully settled invoice totals on their final receipt date minus dated expenses, per currency. */
export async function getPnlReport(filters: PnlFilters): Promise<Result<PnlReport>> { return readPnlReport(filters, false); }

/** Recompute P&L with live canExport authorization and exact signed major-unit CSV cells. */
export async function getPnlExport(filters: PnlFilters): Promise<Result<(string | number)[][]>> {
  const result = await readPnlReport(filters, true); if (!result.ok) return result;
  const data = result.data;
  const { t } = await getI18n();
  return ok([
    [t("Отчёт"), "P&L"], [t("С"), data.from], [t("По (включительно)"), data.to], [t("Часовой пояс"), PNL_TIMEZONE],
    [t("Валюта"), data.currency], [t("Сформирован (UTC)"), data.asOf],
    [t("Revenue basis"), t("Полные суммы счетов с налогом по дате окончательной оплаты; частичные оплаты исключены")],
    [t("Показатель"), t`Сумма, ${data.currency}`, t("Количество")],
    [t("Revenue"), invoicePriceInput(data.revenue), data.invoiceCount], [t("Expenses"), invoicePriceInput(data.expenses), data.expenseCount],
    [t("Net Profit"), invoicePriceInput(data.netProfit), ""], [],
    [t("Категория расходов"), t`Сумма, ${data.currency}`, t("Количество")],
    ...data.categories.map((row) => [t(EXPENSE_CATEGORY_LABELS[row.category]), invoicePriceInput(row.amount), row.count]),
  ]);
}
