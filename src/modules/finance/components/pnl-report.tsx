"use client";
import { useI18n } from "@/i18n/use-i18n";

import { useRef, useState } from "react";
import { CircleDollarSign, Download, ReceiptText, RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorPanel } from "@/components/ui/feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency } from "@/lib/utils";
import type { Result } from "@/types/shared";
import { getPnlReport } from "../actions";
import { FINANCE_CURRENCIES, pnlFiltersSchema } from "../schema";
import { getPnlPeriod, PNL_PERIOD_LABELS, PNL_TIMEZONE, type PnlPeriod } from "../report-periods";
import type { PnlFilters, PnlReport as PnlData } from "../types";
import { EXPENSE_CATEGORY_LABELS } from "./expense-presentation";

/** Show exact P&L totals and expense categories for explicit calendar periods, with an authorized fresh CSV. */
export function PnlReport({ initialData, initialFilters }: { initialData: Result<PnlData>; initialFilters: PnlFilters }) {
  const { t , locale: uiLocale, localeTag: uiLocaleTag } = useI18n();

  const { can } = usePermissions();
  const [data, setData] = useState(initialData), [period, setPeriod] = useState<PnlPeriod>("month");
  const [filters, setFilters] = useState(initialFilters), [loading, setLoading] = useState(false), [exporting, setExporting] = useState(false), [validation, setValidation] = useState("");
  const pending = useRef(false), downloading = useRef(false);
  const parsed = pnlFiltersSchema.safeParse(filters);
  const dirty = data.ok && (data.data.from !== filters.from || data.data.to !== filters.to || data.data.currency !== filters.currency);
  async function handleLoad() {
    if (pending.current) return;
    if (!parsed.success) { setValidation(t("Укажите существующие даты. Конец периода не раньше начала.")); return; }
    pending.current = true; setLoading(true); setValidation("");
    try { setData(await getPnlReport(parsed.data)); }
    catch { setData({ ok: false, error: { code: "STORAGE", message: t("Не удалось загрузить P&L. Повторите обновление") } }); }
    finally { pending.current = false; setLoading(false); }
  }
  async function handleExport() {
    if (downloading.current || !can("canExport") || !data.ok || dirty || loading) return;
    downloading.current = true; setExporting(true);
    const report = data.data;
    try {
      const query = new URLSearchParams({ type: "pnl", from: report.from, to: report.to, currency: report.currency });
      const response = await fetch(`/api/reports/export?${query}`, { cache: "no-store" });
      if (!response.ok || !response.headers.get("content-type")?.startsWith("text/csv")) { toast.error(t(response.status === 403 ? t("Нет права на экспорт отчёта") : response.status === 401 ? t("Войдите в рабочее пространство") : t("Не удалось экспортировать P&L. Обновите отчёт"))); return; }
      const url = URL.createObjectURL(await response.blob());
      try { const anchor = document.createElement("a"); anchor.href = url; anchor.download = `evo-pnl-${report.currency}-${report.from}-${report.to}.csv`; anchor.click(); }
      finally { URL.revokeObjectURL(url); }
    } catch { toast.error(t("Не удалось скачать P&L. Проверьте соединение")); }
    finally { downloading.current = false; setExporting(false); }
  }
  return <section className="motion-fade min-w-0 space-y-6" aria-labelledby="pnl-title">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">{t("FINANCE / REPORTS")}</p><h1 id="pnl-title" className="mt-3 flex items-center gap-3 text-2xl font-semibold sm:text-3xl"><TrendingUp className="size-6 text-primary" />{t("Прибыли и убытки")}</h1><p className="mt-3 text-sm text-muted-foreground">{t("Revenue − Expenses = Net Profit")}</p></div>{can("canExport") && <Button variant="outline" onClick={handleExport} disabled={exporting || loading || !data.ok || dirty}><Download />{exporting ? t("Экспорт…") : t("Экспорт CSV")}</Button>}</header>
    <form className="motion-fade panel space-y-4 p-4 sm:p-5" onSubmit={function handleSubmit(event) { event.preventDefault(); void handleLoad(); }}>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("Период P&L")}>{(Object.keys(PNL_PERIOD_LABELS) as PnlPeriod[]).map((key) => <Button key={key} type="button" size="sm" variant={period === key ? "default" : "outline"} disabled={loading || exporting} aria-pressed={period === key} onClick={function handlePeriod() { setPeriod(key); setValidation(""); if (key !== "custom") setFilters((value) => ({ ...value, ...getPnlPeriod(key) })); }}>{t(PNL_PERIOD_LABELS[key])}</Button>)}</div>
      <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_150px_auto]">
        <label className="space-y-1.5 text-xs text-muted-foreground" htmlFor="pnl-from"><span>{t("С")}</span><Input id="pnl-from" type="date" required value={filters.from} disabled={loading || exporting} readOnly={period !== "custom"} aria-describedby="pnl-period-help" onChange={function handleFrom(event) { setFilters((value) => ({ ...value, from: event.target.value })); setValidation(""); }} /></label>
        <label className="space-y-1.5 text-xs text-muted-foreground" htmlFor="pnl-to"><span>{t("По (включительно)")}</span><Input id="pnl-to" type="date" required value={filters.to} disabled={loading || exporting} readOnly={period !== "custom"} aria-describedby="pnl-period-help" onChange={function handleTo(event) { setFilters((value) => ({ ...value, to: event.target.value })); setValidation(""); }} /></label>
        <label className="space-y-1.5 text-xs text-muted-foreground" htmlFor="pnl-currency"><span>{t("Валюта")}</span><select id="pnl-currency" className="input" value={filters.currency ?? "RUB"} disabled={loading || exporting} onChange={function handleCurrency(event) { const value = event.target.value; if (FINANCE_CURRENCIES.some((code) => code === value)) setFilters((current) => ({ ...current, currency: value as PnlData["currency"] })); }}>{FINANCE_CURRENCIES.map((code) => <option key={code}>{code}</option>)}</select></label>
        <Button type="submit" variant="outline" disabled={loading || exporting}><RefreshCw className={loading ? "animate-spin" : ""} />{loading ? t("Загрузка…") : dirty ? t("Применить") : t("Обновить")}</Button>
      </div>
      <p id="pnl-period-help" className="text-xs text-muted-foreground">{t("Календарные периоды · ")}{PNL_TIMEZONE}{t(". Для своих дат выберите Custom, затем примените фильтры.")}</p>
      {validation && <p className="text-xs text-danger" role="alert">{validation}</p>}
      {dirty && <p className="text-xs text-muted-foreground" role="status">{t("Фильтры изменены. Нажмите «Применить», чтобы обновить отчёт и экспорт.")}</p>}
    </form>
    {loading ? <div role="status" aria-label={t("Загрузка P&L")} className="space-y-5"><div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map((key) => <Skeleton key={key} className="h-36" />)}</div><Skeleton className="h-80" /></div> : !data.ok ? <ErrorPanel error={data.error} /> : <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><p>{t("Период отчёта: ")}<span className="font-mono text-foreground">{data.data.from} — {data.data.to}</span></p><span>{data.data.currency} · {PNL_TIMEZONE}</span></div>
      <div className="grid gap-4 md:grid-cols-3">{[
        { key: "revenue", label: t("Revenue"), amount: data.data.revenue, detail: t`Полностью оплаченных счетов: ${data.data.invoiceCount}`, icon: CircleDollarSign },
        { key: "expenses", label: t("Expenses"), amount: data.data.expenses, detail: t`Расходов за период: ${data.data.expenseCount}`, icon: ReceiptText },
        { key: "netProfit", label: t("Net Profit"), amount: data.data.netProfit, detail: BigInt(data.data.netProfit) < 0n ? t("Убыток за период") : t("Прибыль за период"), icon: TrendingUp },
      ].map((metric) => <article key={metric.key} className={`motion-fade panel min-w-0 p-5 ${metric.key === "netProfit" ? "bg-primary/5" : ""}`}><div className="flex items-center justify-between gap-2"><h2 className="text-sm text-muted-foreground">{t(metric.label)}</h2><metric.icon className="size-4 text-primary" /></div><p data-pnl={metric.key} className={`mt-5 break-words font-mono text-2xl font-semibold tabular-nums ${metric.key === "netProfit" && BigInt(metric.amount) < 0n ? "text-danger" : ""}`}>{formatCurrency(metric.amount, data.data.currency, uiLocale)}</p><p className="mt-3 text-xs text-muted-foreground">{metric.detail}</p></article>)}</div>
      {!data.data.invoiceCount && !data.data.expenseCount && <EmptyState title={t("Нет данных за период")} description={t("Оплаченные счета и расходы выбранной валюты появятся здесь после регистрации.")} />}
      <section className="motion-fade panel min-w-0 overflow-hidden" aria-labelledby="pnl-expenses-title"><header className="p-5"><h2 id="pnl-expenses-title" className="text-sm font-semibold">{t("Расходы по категориям")}</h2></header><Table className="min-w-[410px]"><TableHeader><TableRow><TableHead className="pl-5">{t("Категория")}</TableHead><TableHead className="text-right">{t("Записей")}</TableHead><TableHead className="pr-5 text-right">{t("Сумма, ")}{data.data.currency}</TableHead></TableRow></TableHeader><TableBody>{data.data.categories.map((row) => <TableRow key={row.category}><TableCell className="pl-5">{t(EXPENSE_CATEGORY_LABELS[row.category])}</TableCell><TableCell className="text-right font-mono text-xs">{row.count}</TableCell><TableCell className="whitespace-nowrap pr-5 text-right font-mono text-xs">{formatCurrency(row.amount, data.data.currency, uiLocale)}</TableCell></TableRow>)}<TableRow className="font-semibold"><TableCell className="pl-5">{t("Итого расходы")}</TableCell><TableCell className="text-right font-mono text-xs">{data.data.expenseCount}</TableCell><TableCell className="whitespace-nowrap pr-5 text-right font-mono text-xs">{formatCurrency(data.data.expenses, data.data.currency, uiLocale)}</TableCell></TableRow></TableBody></Table></section>
      <footer className="motion-fade space-y-2 text-xs leading-relaxed text-muted-foreground"><p>{t("Revenue — полная сумма счёта с налогом по дате окончательной оплаты. Частично оплаченные счета исключены. Expenses — по дате расхода. Валюты не суммируются.")}</p><p>{t("Сформирован: ")}{new Intl.DateTimeFormat(uiLocaleTag, { dateStyle: "short", timeStyle: "short", timeZone: PNL_TIMEZONE }).format(new Date(data.data.asOf))} {t(" (Москва). CSV пересчитывается при скачивании.")}</p></footer>
    </>}
  </section>;
}
