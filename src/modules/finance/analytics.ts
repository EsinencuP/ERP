import { getI18n } from "@/i18n/server";
import { INVOICE_STATUS_LABELS } from "./presentation";
import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import type { Result } from "@/types/shared";
import { getFinanceContext } from "./access";
import { getFinanceError } from "./errors";
import { invoicePriceInput } from "./calculations";
import { financeCurrencySchema, INVOICE_STATUSES } from "./schema";
import type { FinanceCurrency, FinanceDashboardData, InvoiceStatus } from "./types";

type SummaryRow = { status: InvoiceStatus; bucket: number; amount: Prisma.Decimal; count: number; openCount: number };
type RevenueRow = { month: string; amount: Prisma.Decimal };
type ClientRow = { id: string; name: string; amount: Prisma.Decimal };
type RecentRow = { id: string; number: string; customerName: string; status: InvoiceStatus; dueDate: Date; total: Prisma.Decimal; balance: Prisma.Decimal };

/** Aggregate normalized receipts and receivables using four parallel, tenant-scoped SQL statements. */
export async function getFinanceDashboard(currency: FinanceCurrency = "EUR"): Promise<Result<FinanceDashboardData>> {
  const context = await getFinanceContext();
  if (!context.ok) return context;
  const parsed = financeCurrencySchema.safeParse(currency);
  if (!parsed.success) return err("VALIDATION", "Выберите валюту EUR");
  const workspaceId = context.data.workspaceId, code = parsed.data;
  const asOf = new Date(), today = asOf.toISOString().slice(0, 10);
  const monthStart = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1));
  const months = Array.from({ length: 6 }, (_, index) => new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - 5 + index, 1)).toISOString().slice(0, 7));
  // Each statement computes balances from receipts at the same cutoff; reads never mutate statuses.
  const facts = Prisma.sql`WITH paid AS (
    SELECT "invoiceId", SUM(amount) AS amount FROM invoice_payments
    WHERE "workspaceId" = ${workspaceId} AND "receivedAt" <= ${asOf} GROUP BY "invoiceId"
  ), facts AS (
    SELECT i.id, i.number, i."contactId", i."customerSnapshot", i."dueDate", i."createdAt", i.total,
      CASE WHEN i.status::text IN ('DRAFT', 'CANCELLED') THEN i.status::text
        WHEN COALESCE(p.amount, 0) >= i.total AND i.total > 0 THEN 'PAID'
        WHEN i."dueDate" < ${today}::date THEN 'OVERDUE' ELSE 'SENT' END AS status,
      CASE WHEN i.status::text IN ('DRAFT', 'CANCELLED') THEN 0 ELSE GREATEST(i.total - COALESCE(p.amount, 0), 0) END AS balance,
      GREATEST(${today}::date - i."dueDate", 0) AS age
    FROM "Invoice" i LEFT JOIN paid p ON p."invoiceId" = i.id
    WHERE i."workspaceId" = ${workspaceId} AND i.currency = ${code} AND i."createdAt" <= ${asOf}
  )`;
  try {
    const [summary, receipts, topClients, recent] = await Promise.all([
      db.$queryRaw<SummaryRow[]>(Prisma.sql`${facts}
        SELECT status, CASE WHEN age = 0 THEN 0 WHEN age <= 30 THEN 1 WHEN age <= 60 THEN 2 WHEN age <= 90 THEN 3 ELSE 4 END AS bucket,
          SUM(balance) AS amount, COUNT(*)::int AS count, COUNT(*) FILTER (WHERE balance > 0)::int AS "openCount"
        FROM facts GROUP BY status, bucket`),
      db.$queryRaw<RevenueRow[]>`SELECT CASE WHEN p."receivedAt" >= ${new Date(`${months[0]}-01T00:00:00.000Z`)}
          THEN to_char(p."receivedAt" AT TIME ZONE 'UTC', 'YYYY-MM') ELSE 'earlier' END AS month, SUM(p.amount) AS amount
        FROM invoice_payments p JOIN "Invoice" i ON i.id = p."invoiceId" AND i."workspaceId" = p."workspaceId"
        WHERE p."workspaceId" = ${workspaceId} AND i."workspaceId" = ${workspaceId} AND i.currency = ${code}
          AND i.status::text NOT IN ('DRAFT', 'CANCELLED') AND p."receivedAt" <= ${asOf} GROUP BY month`,
      db.$queryRaw<ClientRow[]>`SELECT c.id, COALESCE(NULLIF(c.company, ''), c.name) AS name, SUM(p.amount) AS amount
        FROM invoice_payments p JOIN "Invoice" i ON i.id = p."invoiceId" AND i."workspaceId" = p."workspaceId"
        JOIN "Contact" c ON c.id = i."contactId" AND c."workspaceId" = i."workspaceId"
        WHERE p."workspaceId" = ${workspaceId} AND i."workspaceId" = ${workspaceId} AND c."workspaceId" = ${workspaceId}
          AND i.currency = ${code} AND i.status::text NOT IN ('DRAFT', 'CANCELLED') AND p."receivedAt" <= ${asOf}
        GROUP BY c.id, c.company, c.name ORDER BY amount DESC, c.id ASC LIMIT 5`,
      db.$queryRaw<RecentRow[]>(Prisma.sql`${facts}
        SELECT f.id, f.number, f.status, f."dueDate", f.total, f.balance,
          COALESCE(NULLIF(f."customerSnapshot"->>'company', ''), f."customerSnapshot"->>'name', NULLIF(c.company, ''), c.name) AS "customerName"
        FROM facts f JOIN "Contact" c ON c.id = f."contactId" AND c."workspaceId" = ${workspaceId}
        ORDER BY f."createdAt" DESC, f.id ASC LIMIT 5`),
    ]);
    const sum = (rows: { amount: Prisma.Decimal }[]) => rows.reduce((total, row) => total + BigInt(row.amount.toFixed(0)), 0n).toString();
    const aging = Array.from({ length: 5 }, (_, bucket) => ({ bucket, amount: sum(summary.filter((row) => row.bucket === bucket)), count: summary.filter((row) => row.bucket === bucket).reduce((count, row) => count + row.openCount, 0) }));
    const overdue = summary.filter((row) => row.status === "OVERDUE");
    return ok({
      currency: code, asOf: asOf.toISOString(),
      kpis: { totalRevenue: sum(receipts), outstanding: sum(summary), paidMtd: sum(receipts.filter((row) => row.month === monthStart.toISOString().slice(0, 7))), overdue: sum(overdue), openCount: summary.reduce((count, row) => count + row.openCount, 0), overdueCount: overdue.reduce((count, row) => count + row.openCount, 0) },
      revenue: months.map((month) => ({ month, amount: sum(receipts.filter((row) => row.month === month)) })),
      statuses: INVOICE_STATUSES.map((status) => ({ status, count: summary.filter((row) => row.status === status).reduce((count, row) => count + row.count, 0) })),
      topClients: topClients.map((row) => ({ id: row.id, name: row.name, amount: row.amount.toFixed(0) })), aging,
      recentInvoices: recent.map((row) => ({ ...row, dueDate: row.dueDate.toISOString().slice(0, 10), total: row.total.toFixed(0), balance: row.balance.toFixed(0) })),
    });
  } catch (error: unknown) { return getFinanceError(error); }
}

/** Preserve dashboard CSV export using fresh normalized aggregates and server-side canExport. */
export async function getFinanceExport(currency: FinanceCurrency = "EUR"): Promise<Result<(string | number)[][]>> {
  const context = await getFinanceContext(); if (!context.ok) return context;
  if (!hasPermission(context.data.role, "canExport")) return err("FORBIDDEN", "Нет права на экспорт финансового отчёта");
  const result = await getFinanceDashboard(currency); if (!result.ok) return result;
  const data = result.data;
  const { t } = await getI18n();
  return ok([
    [t("Валюта"), data.currency], [t("Сформирован (UTC)"), data.asOf], [t("Показатель"), t`Сумма, ${data.currency}`],
    [t("Dashboard Revenue"), invoicePriceInput(data.kpis.totalRevenue)], [t("Outstanding"), invoicePriceInput(data.kpis.outstanding)],
    [t("Paid MTD"), invoicePriceInput(data.kpis.paidMtd)], [t("Overdue"), invoicePriceInput(data.kpis.overdue)], [],
    [t("Месяц"), t`Поступления, ${data.currency}`], ...data.revenue.map((row) => [row.month, invoicePriceInput(row.amount)]), [],
    [t("Статус"), t("Количество счетов")], ...data.statuses.map((row) => [t(INVOICE_STATUS_LABELS[row.status]), row.count]), [],
    [t("Клиент"), t`Поступления, ${data.currency}`], ...data.topClients.map((row) => [row.name, invoicePriceInput(row.amount)]), [],
    [t("Дней после срока оплаты"), t`Остаток, ${data.currency}`, t("Количество счетов")],
    ...data.aging.map((row) => [[t("В срок"), "1–30", "31–60", "61–90", t("Более 90")][row.bucket] ?? "", invoicePriceInput(row.amount), row.count]),
  ]);
}
