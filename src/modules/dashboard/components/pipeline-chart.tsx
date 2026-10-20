"use client";
import { useI18n } from "@/i18n/use-i18n";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Link from "next/link";
import { PIPELINE_STAGES } from "@/modules/crm/pipeline";
import type { DealDashboardData } from "@/modules/crm/analytics";

/** Compare exact deal counts across the six CRM stages, including closed outcomes. */
export function PipelineChart({ data }: { data: DealDashboardData }) {
  const { t } = useI18n();

  const rows = data.stages.map((row) => ({ ...row, label: PIPELINE_STAGES[row.stage].label }));
  const axisStyle = { fill: "hsl(var(--color-muted))", fontSize: 10 };
  return <section className="motion-fade panel min-w-0 p-5 sm:p-6" aria-labelledby="dashboard-pipeline-title"><header className="flex flex-wrap justify-between gap-3"><div><h2 id="dashboard-pipeline-title" className="text-sm font-semibold">{t("Воронка сделок")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("Количество по этапам · всего ")}{data.total}</p></div><Link href="/crm/pipeline" className="text-xs text-primary hover:underline">{t("Открыть CRM →")}</Link></header><div className="mt-6 h-64 min-w-0" role="group" aria-label={t("Столбчатая диаграмма сделок. Точные количества доступны под графиком.")}><ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={rows} accessibilityLayer margin={{ top: 15, right: 8, left: 0, bottom: 5 }}><CartesianGrid vertical={false} stroke="hsl(var(--color-grid))" strokeDasharray="3 5" /><XAxis dataKey="stage" tickFormatter={(stage: keyof typeof PIPELINE_STAGES) => t(PIPELINE_STAGES[stage].label)} tick={axisStyle} interval={0} angle={-25} textAnchor="end" height={68} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} domain={[0, (maximum: number) => Math.max(1, maximum)]} width={32} tick={axisStyle} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "hsl(var(--color-hover))" }} content={({ active, label }) => { const row = rows.find((item) => item.stage === label); return active && row ? <div className="motion-fade rounded-lg border bg-popover p-3 text-xs shadow-sm"><p>{t(row.label)}</p><p className="mt-1 font-mono">{t("Сделок: ")}{row.count}</p></div> : null; }} /><Bar dataKey="count" name={t("Сделки")} maxBarSize={40} radius={[4, 4, 0, 0]} isAnimationActive={false}>{rows.map((row) => <Cell key={row.stage} fill={`hsl(var(--color-${PIPELINE_STAGES[row.stage].tone}))`} />)}</Bar></BarChart></ResponsiveContainer></div>{!data.total && <p className="mt-3 text-xs text-muted-foreground">{t("Сделок пока нет. Создайте первую в CRM.")}</p>}<details className="mt-4 text-xs"><summary className="w-fit cursor-pointer rounded text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{t("Данные воронки")}</summary><dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{rows.map((row) => <div key={row.stage} className="rounded-lg border p-3"><dt className="text-muted-foreground">{t(row.label)}</dt><dd className="mt-2 font-mono">{row.count}</dd></div>)}</dl></details></section>;
}
