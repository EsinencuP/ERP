"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CircleDollarSign, Clock3, CreditCard, Download, RefreshCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorPanel } from "@/components/ui/feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { downloadCsv } from "@/lib/export";
import { usePermissions } from "@/hooks/usePermissions";
import type { Result } from "@/types/shared";
import { getFinanceDashboard, getFinanceExport } from "../actions";
import { FINANCE_CURRENCIES, financeCurrencySchema } from "../schema";
import type { FinanceCurrency, FinanceDashboardData } from "../types";
import { FinanceCharts } from "./finance-charts";
import { InvoiceStatusBadge } from "./invoice-presentation";

const agingLabels = ["В срок", "1–30 дней", "31–60 дней", "61–90 дней", "Более 90 дней"];

/** Show normalized finance KPIs, charts, AR aging and recent invoices with a currency-safe refresh. */
export function FinanceDashboard({ initialData }: { initialData: Result<FinanceDashboardData> }) {
  const { can } = usePermissions(), [exporting, setExporting] = useState(false);
  const [data, setData] = useState(initialData), [currency, setCurrency] = useState<FinanceCurrency>(initialData.ok ? initialData.data.currency : "RUB");
  const [revision, setRevision] = useState(0), [loading, setLoading] = useState(false), first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    let active = true; setLoading(true);
    getFinanceDashboard(currency).then((result) => { if (active) setData(result); }).catch(() => { if (active) setData({ ok: false, error: { code: "STORAGE", message: "Не удалось загрузить финансовую аналитику" } }); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currency, revision]);
  const busy = loading || (data.ok && data.data.currency !== currency);
  async function handleExport() {
    if (exporting || !can("canExport")) return;
    setExporting(true);
    try {
      const result = await getFinanceExport(currency);
      if (!result.ok) { toast.error(result.error.message); return; }
      const download = downloadCsv(`evo-finance-${currency}.csv`, result.data);
      if (!download.ok) toast.error(download.error.message);
    } catch { toast.error("Не удалось загрузить финансовый отчёт"); }
    finally { setExporting(false); }
  }
  return <section className="motion-fade min-w-0 space-y-5" aria-labelledby="finance-dashboard-title">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="finance-dashboard-title" className="text-base font-semibold">Финансовый обзор</h2><p className="mt-1 text-xs text-muted-foreground">По зарегистрированным поступлениям, включая налог. Валюты учитываются отдельно.</p></div><div className="flex flex-wrap items-center gap-2">{can("canExport") && <Button variant="outline" disabled={exporting || busy || !data.ok} onClick={handleExport}><Download />{exporting ? "Отчёт…" : "Отчёт"}</Button>}<label htmlFor="finance-dashboard-currency" className="sr-only">Валюта аналитики</label><select id="finance-dashboard-currency" className="input w-auto" value={currency} onChange={function handleCurrency(event) { const parsed = financeCurrencySchema.safeParse(event.target.value); if (parsed.success) setCurrency(parsed.data); }}>{FINANCE_CURRENCIES.map((code) => <option key={code}>{code}</option>)}</select><Button variant="outline" size="icon" disabled={loading} aria-label="Обновить финансовый обзор" onClick={function handleRefresh() { setRevision((value) => value + 1); }}><RefreshCw /></Button></div></header>
    {busy ? <div role="status" aria-label="Загрузка финансового обзора" className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((value) => <Skeleton key={value} className="h-40" />)}</div><Skeleton className="h-80" /></div> : !data.ok ? <ErrorPanel error={data.error} /> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
        { key: "totalRevenue", label: "Total Revenue", description: "Поступления за всё время", amount: data.data.kpis.totalRevenue, icon: CircleDollarSign, href: "/finance/payments", emphasis: true },
        { key: "outstanding", label: "Outstanding", description: `К оплате · ${data.data.kpis.openCount} счетов`, amount: data.data.kpis.outstanding, icon: Clock3, href: "/finance", emphasis: false },
        { key: "paidMtd", label: "Paid MTD", description: "Поступления с начала месяца", amount: data.data.kpis.paidMtd, icon: CreditCard, href: "/finance/payments", emphasis: false },
        { key: "overdue", label: "Overdue", description: `Просрочено · ${data.data.kpis.overdueCount} счетов`, amount: data.data.kpis.overdue, icon: TriangleAlert, href: "/finance", emphasis: false },
      ].map((metric) => <Link key={metric.key} href={metric.href} className={`motion-fade panel min-w-0 p-5 transition-colors hover:border-primary/40 ${metric.emphasis ? "bg-primary/5" : ""}`}><div className="flex items-center justify-between gap-2"><h3 className="text-xs text-muted-foreground">{metric.label}</h3><metric.icon className={`size-4 ${metric.key === "overdue" ? "text-warning" : "text-primary"}`} /></div><p className="mt-5 break-words font-mono text-2xl font-semibold tabular-nums" data-kpi={metric.key}>{formatCurrency(metric.amount, currency)}</p><p className="mt-3 text-xs text-muted-foreground">{metric.description}</p></Link>)}</div>
      <FinanceCharts data={data.data} />
      <section className="motion-fade panel p-5 sm:p-6" aria-labelledby="aging-title"><div className="flex flex-wrap justify-between gap-2"><div><h3 id="aging-title" className="text-sm font-semibold">Дебиторская задолженность по срокам</h3><p className="mt-1 text-xs text-muted-foreground">Остаток по выданным счетам · дни после срока оплаты</p></div><span className="font-mono text-xs text-muted-foreground">{currency}</span></div><dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{data.data.aging.map((row) => <div key={row.bucket} className="motion-fade min-w-0 rounded-lg border p-4"><dt className="text-xs text-muted-foreground">{agingLabels[row.bucket]}</dt><dd className="mt-3 break-words font-mono text-sm font-semibold">{formatCurrency(row.amount, currency)}</dd><dd className="mt-2 text-xs text-muted-foreground">Счетов: {row.count}</dd></div>)}</dl></section>
      <section className="motion-fade panel min-w-0 overflow-hidden" aria-labelledby="recent-invoices-title"><header className="flex items-center justify-between gap-3 p-5"><h3 id="recent-invoices-title" className="text-sm font-semibold">Последние счета</h3><Link href="/finance" className="text-xs text-primary hover:underline">Все счета →</Link></header><Table className="min-w-[650px]"><TableHeader><TableRow><TableHead className="pl-5">Счёт / клиент</TableHead><TableHead>Оплатить до</TableHead><TableHead>Статус</TableHead><TableHead className="text-right">Итого</TableHead><TableHead className="pr-5 text-right">Остаток</TableHead></TableRow></TableHeader><TableBody>{data.data.recentInvoices.map((invoice) => <TableRow key={invoice.id}><TableCell className="pl-5"><Link href={`/finance/${invoice.id}`} className="font-mono text-xs text-primary hover:underline">{invoice.number}</Link><span className="mt-1 block max-w-52 truncate text-xs text-muted-foreground">{invoice.customerName}</span></TableCell><TableCell className="text-xs">{invoice.dueDate}</TableCell><TableCell><InvoiceStatusBadge status={invoice.status} /></TableCell><TableCell className="text-right font-mono text-xs">{formatCurrency(invoice.total, currency)}</TableCell><TableCell className="pr-5 text-right font-mono text-xs">{invoice.status === "DRAFT" || invoice.status === "CANCELLED" ? "—" : formatCurrency(invoice.balance, currency)}</TableCell></TableRow>)}</TableBody></Table>{!data.data.recentInvoices.length && <EmptyState title="Счетов пока нет" description="Новый счёт можно создать в разделе финансов." />}</section>
      <p className="text-xs text-muted-foreground">Обновлено: {new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(new Date(data.data.asOf))} UTC. Месяцы и сроки рассчитываются в UTC.</p>
    </>}
  </section>;
}
