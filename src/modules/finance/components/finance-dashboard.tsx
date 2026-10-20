"use client";
import { useI18n } from "@/i18n/use-i18n";

import Link from "next/link";
import { RecentInvoices } from "./recent-invoices";
import { useEffect, useRef, useState } from "react";
import { CircleDollarSign, Clock3, CreditCard, Download, RefreshCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/ui/feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { downloadCsv } from "@/lib/export";
import { usePermissions } from "@/hooks/usePermissions";
import type { Result } from "@/types/shared";
import { getFinanceDashboard, getFinanceExport } from "../actions";
import { FINANCE_CURRENCIES, financeCurrencySchema } from "../schema";
import type { FinanceCurrency, FinanceDashboardData } from "../types";
import { FinanceCharts } from "./finance-charts";

const agingLabels = ["В срок", "1–30 дней", "31–60 дней", "61–90 дней", "Более 90 дней"];

/** Show normalized finance KPIs, charts, AR aging and recent invoices with a currency-safe refresh. */
export function FinanceDashboard({ initialData }: { initialData: Result<FinanceDashboardData> }) {
  const { t, count, locale: uiLocale, localeTag: uiLocaleTag } = useI18n();

  const { can } = usePermissions(), [exporting, setExporting] = useState(false);
  const [data, setData] = useState(initialData), [currency, setCurrency] = useState<FinanceCurrency>(initialData.ok ? initialData.data.currency : "RUB");
  const [revision, setRevision] = useState(0), [loading, setLoading] = useState(false), first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    let active = true; setLoading(true);
    getFinanceDashboard(currency).then((result) => { if (active) setData(result); }).catch(() => { if (active) setData({ ok: false, error: { code: "STORAGE", message: t("Не удалось загрузить финансовую аналитику") } }); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currency, revision]);
  const busy = loading || (data.ok && data.data.currency !== currency);
  async function handleExport() {
    if (exporting || !can("canExport")) return;
    setExporting(true);
    try {
      const result = await getFinanceExport(currency);
      if (!result.ok) { toast.error(t(result.error.message)); return; }
      const download = downloadCsv(`evo-finance-${currency}.csv`, result.data);
      if (!download.ok) toast.error(t(download.error.message));
    } catch { toast.error(t("Не удалось загрузить финансовый отчёт")); }
    finally { setExporting(false); }
  }
  return <section className="motion-fade min-w-0 space-y-5" aria-labelledby="finance-dashboard-title">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="finance-dashboard-title" className="text-base font-semibold">{t("Финансовый обзор")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("По зарегистрированным поступлениям, включая налог. Валюты учитываются отдельно.")}</p></div><div className="flex flex-wrap items-center gap-2">{can("canExport") && <Button variant="outline" disabled={exporting || busy || !data.ok} onClick={handleExport}><Download />{exporting ? t("Отчёт…") : t("Отчёт")}</Button>}<label htmlFor="finance-dashboard-currency" className="sr-only">{t("Валюта аналитики")}</label><select id="finance-dashboard-currency" className="input w-auto" value={currency} onChange={function handleCurrency(event) { const parsed = financeCurrencySchema.safeParse(event.target.value); if (parsed.success) setCurrency(parsed.data); }}>{FINANCE_CURRENCIES.map((code) => <option key={code}>{code}</option>)}</select><Button variant="outline" size="icon" disabled={loading} aria-label={t("Обновить финансовый обзор")} onClick={function handleRefresh() { setRevision((value) => value + 1); }}><RefreshCw /></Button></div></header>
    {busy ? <div role="status" aria-label={t("Загрузка финансового обзора")} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((value) => <Skeleton key={value} className="h-40" />)}</div><Skeleton className="h-80" /></div> : !data.ok ? <ErrorPanel error={data.error} /> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
        { key: "totalRevenue", label: t("Total Revenue"), description: t("Поступления за всё время"), amount: data.data.kpis.totalRevenue, icon: CircleDollarSign, href: "/finance/payments", emphasis: true },
        { key: "outstanding", label: t("Outstanding"), description: t`Awaiting payment · ${count(data.data.kpis.openCount, "invoice")}`, amount: data.data.kpis.outstanding, icon: Clock3, href: "/finance", emphasis: false },
        { key: "paidMtd", label: t("Paid MTD"), description: t("Поступления с начала месяца"), amount: data.data.kpis.paidMtd, icon: CreditCard, href: "/finance/payments", emphasis: false },
        { key: "overdue", label: t("Overdue"), description: t`Overdue · ${count(data.data.kpis.overdueCount, "invoice")}`, amount: data.data.kpis.overdue, icon: TriangleAlert, href: "/finance", emphasis: false },
      ].map((metric) => <Link key={metric.key} href={metric.href} className={`motion-fade panel min-w-0 p-5 transition-colors hover:border-primary/40 ${metric.emphasis ? "bg-primary/5" : ""}`}><div className="flex items-center justify-between gap-2"><h3 className="text-xs text-muted-foreground">{t(metric.label)}</h3><metric.icon className={`size-4 ${metric.key === "overdue" ? "text-warning" : "text-primary"}`} /></div><p className="mt-5 break-words font-mono text-2xl font-semibold tabular-nums" data-kpi={metric.key}>{formatCurrency(metric.amount, currency, uiLocale)}</p><p className="mt-3 text-xs text-muted-foreground">{metric.description}</p></Link>)}</div>
      <FinanceCharts data={data.data} />
      <section className="motion-fade panel p-5 sm:p-6" aria-labelledby="aging-title"><div className="flex flex-wrap justify-between gap-2"><div><h3 id="aging-title" className="text-sm font-semibold">{t("Дебиторская задолженность по срокам")}</h3><p className="mt-1 text-xs text-muted-foreground">{t("Остаток по выданным счетам · дни после срока оплаты")}</p></div><span className="font-mono text-xs text-muted-foreground">{currency}</span></div><dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{data.data.aging.map((row) => <div key={row.bucket} className="motion-fade min-w-0 rounded-lg border p-4"><dt className="text-xs text-muted-foreground">{t(agingLabels[row.bucket])}</dt><dd className="mt-3 break-words font-mono text-sm font-semibold">{formatCurrency(row.amount, currency, uiLocale)}</dd><dd className="mt-2 text-xs text-muted-foreground">{t("Счетов: ")}{row.count}</dd></div>)}</dl></section>
      <RecentInvoices invoices={data.data.recentInvoices} currency={currency} />
      <p className="text-xs text-muted-foreground">{t("Обновлено: ")}{new Intl.DateTimeFormat(uiLocaleTag, { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(new Date(data.data.asOf))} {t(" UTC. Месяцы и сроки рассчитываются в UTC.")}</p>
    </>}
  </section>;
}
