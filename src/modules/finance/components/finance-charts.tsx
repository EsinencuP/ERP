"use client";
import { useI18n } from "@/i18n/use-i18n";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/ui/feedback";
import { getChartMaximum, getChartTick, getChartValue } from "../chart-utils";
import type { FinanceDashboardData } from "../types";
import { RevenueChart } from "./revenue-chart";
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS } from "./invoice-presentation";

const statusColors = INVOICE_STATUS_COLORS;
const axisStyle = { fill: "hsl(var(--color-muted))", fontSize: 10 };

function ChartTooltip({ title, value }: { title: string; value: string }) {
  const { t } = useI18n();

  return <div className="motion-fade rounded-lg border bg-[hsl(var(--color-surface-raised))] p-3 text-xs shadow-sm"><p className="max-w-64 break-words text-muted-foreground">{title}</p><p className="mt-1 font-mono font-medium">{value}</p></div>;
}

/** Render the six-month line, invoice-count donut and top-five receipts bar chart with exact accessible data. */
export function FinanceCharts({ data }: { data: FinanceDashboardData }) {
  const { t, count, locale: uiLocale } = useI18n();

  const clientMaximum = getChartMaximum(data.topClients.map((row) => row.amount));
  const clients = data.topClients.map((row) => ({ ...row, value: getChartValue(row.amount, clientMaximum) }));
  const statuses = data.statuses.filter((row) => row.count > 0), invoiceCount = data.statuses.reduce((sum, row) => sum + row.count, 0);
  return <div className="grid min-w-0 gap-5 xl:grid-cols-2">
    <div className="min-w-0 xl:col-span-2"><RevenueChart revenue={data.revenue} currency={data.currency} /></div>
    <section className="motion-fade panel min-w-0 p-5 sm:p-6" aria-labelledby="statuses-title"><h2 id="statuses-title" className="text-sm font-semibold">{t("Статусы счетов")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("Количество счетов · ")}{data.currency}</p>
      {invoiceCount ? <div className="mt-5 flex flex-wrap items-center justify-center gap-5"><div className="relative h-52 w-52 shrink-0" role="img" aria-label={t`Invoice status chart: ${count(invoiceCount, "invoice")}. The distribution is listed alongside.`}><ResponsiveContainer width="100%" height="100%" minWidth={0}><PieChart><Pie data={statuses} dataKey="count" nameKey="status" innerRadius={65} outerRadius={94} paddingAngle={2} stroke="hsl(var(--color-surface))" isAnimationActive={false}>{statuses.map((row) => <Cell key={row.status} fill={statusColors[row.status]} />)}</Pie><Tooltip content={({ active, payload }) => { const name: unknown = payload?.[0]?.name; const row = statuses.find((item) => item.status === name); return active && row ? <ChartTooltip title={t(INVOICE_STATUS_LABELS[row.status])} value={count(row.count, "invoice")} /> : null; }} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="font-mono text-3xl font-semibold">{invoiceCount}</span><span className="text-xs text-muted-foreground">{count(invoiceCount, "invoice", false)}</span></div></div><dl className="min-w-40 flex-1 space-y-3">{data.statuses.map((row) => <div key={row.status} className="flex items-center justify-between gap-3 text-xs"><dt className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: statusColors[row.status] }} />{t(INVOICE_STATUS_LABELS[row.status])}</dt><dd className="font-mono">{row.count}</dd></div>)}</dl></div> : <EmptyState title={t("Счетов пока нет")} description={t("В этой валюте ещё нет счетов.")} />}
    </section>
    <section className="motion-fade panel min-w-0 p-5 sm:p-6" aria-labelledby="clients-title"><h2 id="clients-title" className="text-sm font-semibold">{t("Топ-5 клиентов")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("По сумме поступлений за всё время · ")}{data.currency}</p>
      {clients.length ? <><div className="mt-5 h-64 min-w-0" role="img" aria-label={t("Горизонтальный график поступлений от пяти крупнейших клиентов. Точные значения приведены под графиком.")}><ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart layout="vertical" data={clients} margin={{ left: 0, right: 8, top: 5, bottom: 5 }}><CartesianGrid horizontal={false} stroke="hsl(var(--color-grid))" strokeDasharray="3 5" /><XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={axisStyle} tickFormatter={(value: number) => getChartTick(value, clientMaximum, data.currency, uiLocale)} /><YAxis type="category" dataKey="id" width={100} axisLine={false} tickLine={false} tick={axisStyle} tickFormatter={(id: string) => { const name = clients.find((row) => row.id === id)?.name ?? ""; return name.length > 14 ? `${name.slice(0, 13)}…` : name; }} /><Tooltip cursor={{ fill: "hsl(var(--color-hover))" }} content={({ active, label }) => { const row = typeof label === "string" ? clients.find((item) => item.id === label) : undefined; return active && row ? <ChartTooltip title={row.name} value={formatCurrency(row.amount, data.currency, uiLocale)} /> : null; }} /><Bar dataKey="value" fill="hsl(var(--color-primary))" barSize={20} radius={[0, 4, 4, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div><details className="mt-4 text-xs"><summary className="w-fit cursor-pointer rounded text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{t("Данные клиентов")}</summary><dl className="mt-3 space-y-2">{clients.map((row) => <div key={row.id} className="flex justify-between gap-3"><dt className="min-w-0 break-words">{row.name}</dt><dd className="shrink-0 font-mono">{formatCurrency(row.amount, data.currency, uiLocale)}</dd></div>)}</dl></details></> : <EmptyState title={t("Поступлений пока нет")} description={t("Зарегистрированные платежи сформируют рейтинг клиентов.")} />}
    </section>
  </div>;
}
