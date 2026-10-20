
import { useI18n } from "@/i18n/use-i18n";
import Link from "next/link";
import { Activity, ArrowRight, CircleDollarSign, Handshake, PackageSearch, TriangleAlert, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/feedback";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatCurrency, initials } from "@/lib/utils";
import { RevenueChart } from "@/modules/finance/components/revenue-chart";
import { RecentInvoices } from "@/modules/finance/components/recent-invoices";
import { PipelineChart } from "@/modules/dashboard/components/pipeline-chart";
import { DashboardFrame } from "@/modules/dashboard/components/dashboard-frame";
import { getDashboardActivityLink, DASHBOARD_DOMAINS, DASHBOARD_ACTIONS } from "@/modules/dashboard/presentation";
import type { DashboardData } from "@/modules/dashboard/types";
import type { FinanceCurrency } from "@/modules/finance/types";
import type { AppError } from "@/types/shared";

function ReadError({ title, error }: { title: string; error: AppError }) {
  const { t } = useI18n();
 return <section className="motion-fade panel min-w-0 p-5 sm:p-6"><h2 className="text-sm font-semibold">{t(title)}</h2><p role="alert" className="mt-4 text-xs text-destructive">{t(error.message)}</p></section>; }

/** Render normalized cross-module KPIs, paired charts, five invoices and bounded audit summaries on the server. */
export function Dashboard({ data, name, currency, now }: { data: DashboardData; name: string; currency: FinanceCurrency; now: string }) {
  const { t , locale: uiLocale } = useI18n();

  const { finance, deals, stock, pending, activity } = data;
  const metrics = [
    { key: "revenue", label: t("Dashboard Revenue"), value: finance.ok ? formatCurrency(finance.data.kpis.totalRevenue, currency, uiLocale) : "—", description: t`Поступления за всё время · ${currency}`, error: finance.ok ? null : finance.error, href: "/finance/payments", icon: CircleDollarSign },
    { key: "openDeals", label: t("Open Deals"), value: deals.ok ? String(deals.data.open) : "—", description: t("Без выигранных и проигранных"), error: deals.ok ? null : deals.error, href: "/crm/pipeline", icon: Handshake },
    { key: "lowStock", label: t("Low Stock Alert"), value: stock.ok ? String(stock.data.total) : "—", description: stock.ok ? t`Мало: ${stock.data.lowStock} · Нет: ${stock.data.outOfStock}` : t("Товары требуют пополнения"), error: stock.ok ? null : stock.error, href: "/inventory/dashboard", icon: PackageSearch },
    { key: "hrPending", label: t("HR Pending"), value: pending.ok ? String(pending.data) : "—", description: pending.ok ? t("Заявки на отпуск ждут решения") : pending.error.code === "FORBIDDEN" ? t("Доступно руководителям") : t("Заявки на отпуск"), error: pending.ok || pending.error.code === "FORBIDDEN" ? null : pending.error, href: "/hr/leaves", icon: Users },
  ];
  return <DashboardFrame currency={currency} name={name} now={now}>
    <div data-dashboard-kpis className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <Link key={metric.key} href={metric.href} className={`motion-fade panel min-w-0 p-5 transition-colors hover:border-primary/40 ${metric.key === "revenue" ? "bg-primary/5" : ""}`}><div className="flex items-center justify-between gap-3"><h2 className="text-xs text-muted-foreground">{t(metric.label)}</h2><metric.icon className={`size-4 shrink-0 ${metric.key === "lowStock" && stock.ok && stock.data.total ? "text-warning" : "text-primary"}`} /></div><p data-kpi={metric.key} className="mt-4 break-words font-mono text-2xl font-semibold tabular-nums">{metric.value}</p><p className="mt-3 text-[11px] text-muted-foreground">{metric.description}</p>{metric.error && <p role="alert" className="mt-2 text-xs text-destructive">{t(metric.error.message)}</p>}</Link>)}</div>
    {stock.ok && stock.data.lowStock > 0 && <aside data-low-stock-banner className="motion-fade flex flex-wrap items-center justify-between gap-4 rounded-xl border border-warning/30 bg-warning/10 p-4" aria-label={t("Предупреждение о низком запасе")}><div className="flex min-w-0 items-start gap-3"><TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" /><div><h2 className="text-sm font-semibold">{t("Запасы требуют внимания")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("Мало на складе: ")}{stock.data.lowStock} {t(" товаров. Нет в наличии: ")}{stock.data.outOfStock}{t(". Проверьте план пополнения.")}</p></div></div><Link href="/inventory/dashboard" className="inline-flex shrink-0 items-center gap-2 text-xs font-medium text-primary hover:underline">{t("К пополнению")}<ArrowRight className="size-3" /></Link></aside>}
    <div data-dashboard-charts className="grid min-w-0 gap-5 xl:grid-cols-2">{finance.ok ? <RevenueChart revenue={finance.data.revenue} currency={currency} /> : <ReadError title={t("Поступления за 6 месяцев")} error={finance.error} />}{deals.ok ? <PipelineChart data={deals.data} /> : <ReadError title={t("Воронка сделок")} error={deals.error} />}</div>
    <div data-dashboard-details className="grid min-w-0 gap-5 xl:grid-cols-2">{finance.ok ? <RecentInvoices invoices={finance.data.recentInvoices} currency={currency} /> : <ReadError title={t("Последние счета")} error={finance.error} />}{!activity.ok ? <ReadError title={t("Лента действий")} error={activity.error} /> : <section className="motion-fade panel min-w-0 p-5 sm:p-6" aria-labelledby="dashboard-activity-title"><header className="flex justify-between gap-3"><div><h2 id="dashboard-activity-title" className="text-sm font-semibold">{t("Лента действий")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("Последние 8 событий рабочего пространства")}</p></div><Activity className="size-4 shrink-0 text-muted-foreground" /></header>{activity.data.length ? <ol className="mt-5 divide-y">{activity.data.map((event) => { const href = getDashboardActivityLink(event); return <li key={event.id} className="motion-fade flex gap-3 py-3 first:pt-0 last:pb-0"><span aria-hidden="true" className="avatar size-8 shrink-0 text-[9px]">{initials(event.actor)}</span><div className="min-w-0"><p className="break-words text-xs"><span className="font-medium">{event.actor}</span><span className="text-muted-foreground"> {Object.hasOwn(DASHBOARD_ACTIONS, event.action) ? DASHBOARD_ACTIONS[event.action] : t("изменил(а) запись")}</span></p>{href ? <Link href={href} className="mt-1 block truncate text-xs text-primary hover:underline" title={event.title}>{event.title}</Link> : <p className="mt-1 truncate text-xs" title={event.title}>{event.title}</p>}<p className="mt-1 text-[10px] text-muted-foreground"><RelativeTime value={event.createdAt} now={now} /> · {Object.hasOwn(DASHBOARD_DOMAINS, event.domain) ? DASHBOARD_DOMAINS[event.domain]?.label : t("Система")}</p></div></li>; })}</ol> : <EmptyState title={t("Пока нет действий")} description={t("Создание и изменение записей появятся здесь после сохранения.")} />}</section>}</div>
  </DashboardFrame>;
}
