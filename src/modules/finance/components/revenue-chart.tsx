"use client";
import { useI18n } from "@/i18n/use-i18n";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { getChartMaximum, getChartTick, getChartValue } from "../chart-utils";
import type { FinanceDashboardData } from "../types";

const axisStyle = { fill: "hsl(var(--color-muted))", fontSize: 10 };
/** Render six calendar months of receipts with bounded chart coordinates and exact accessible amounts. */
export function RevenueChart({ revenue: revenueRows, currency }: Pick<FinanceDashboardData, "revenue" | "currency">) {
  const { t , locale: uiLocale, localeTag: uiLocaleTag } = useI18n();

  const revenueMaximum = getChartMaximum(revenueRows.map((row) => row.amount));
  const revenue = revenueRows.map((row) => ({ ...row, label: new Intl.DateTimeFormat(uiLocaleTag, { month: "short", timeZone: "UTC" }).format(new Date(`${row.month}-01T00:00:00Z`)), value: getChartValue(row.amount, revenueMaximum) }));
  return (
    <section className="motion-fade panel min-w-0 p-5 sm:p-6" aria-labelledby="revenue-title">
      <h2 id="revenue-title" className="text-sm font-semibold">{t("Поступления за 6 месяцев")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("Включая текущий месяц · ")}{currency} {t(" · по дате получения")}</p>
      <div className="mt-6 h-64 min-w-0" role="group" aria-label={t("Линейный график поступлений. Точные значения приведены под графиком.")}><ResponsiveContainer width="100%" height="100%" minWidth={0}><LineChart data={revenue} accessibilityLayer margin={{ top: 15, right: 15, left: 5, bottom: 5 }}>
        <CartesianGrid vertical={false} stroke="hsl(var(--color-grid))" strokeDasharray="3 5" /><XAxis dataKey="month" tickFormatter={(month: string) => revenue.find((row) => row.month === month)?.label ?? month} axisLine={false} tickLine={false} tick={axisStyle} minTickGap={5} />
        <YAxis domain={[0, 100]} width={72} axisLine={false} tickLine={false} tick={axisStyle} tickFormatter={(value: number) => getChartTick(value, revenueMaximum, currency, uiLocale)} />
        <Tooltip content={({ active, label }) => { const row = typeof label === "string" ? revenue.find((item) => item.month === label) : undefined; return active && row ? <div className="motion-fade rounded-lg border bg-popover p-3 text-xs shadow-sm"><p>{row.month}</p><p className="mt-1 font-mono">{formatCurrency(row.amount, currency, uiLocale)}</p></div> : null; }} />
        <Line type="monotone" dataKey="value" name={t("Поступления")} stroke="hsl(var(--color-primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--color-surface))", strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
      </LineChart></ResponsiveContainer></div>
      {revenueRows.every((row) => row.amount === "0") && <p className="mt-3 text-xs text-muted-foreground">{t("За последние 6 месяцев поступлений в этой валюте нет.")}</p>}
      <details className="mt-4 text-xs"><summary className="w-fit cursor-pointer rounded text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{t("Данные графика")}</summary><dl className="mt-3 grid gap-3 sm:grid-cols-3">{revenueRows.map((row) => <div key={row.month} className="flex justify-between gap-3 rounded-lg border p-3"><dt>{row.month}</dt><dd className="font-mono">{formatCurrency(row.amount, currency, uiLocale)}</dd></div>)}</dl></details>
    </section>
  );
}
