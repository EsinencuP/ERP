"use client";

import { useState } from "react";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, CalendarDays, CircleDollarSign, CreditCard, FolderKanban, Handshake, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/feedback";
import { dateLabel, initials, money } from "@/lib/utils";
import { downloadCsv } from "@/lib/export";
import { getExportReport } from "@/lib/export-actions";
import { usePermissions } from "@/hooks/usePermissions";
import { canWrite } from "@/lib/permissions";
import { modules } from "@/lib/modules";
import type { Domain, SessionContext, WorkspaceState } from "@/types/shared";

type Period = "30" | "90" | "365";
const quickLinks: { domain: Domain; icon: typeof Handshake; description: string }[] = [
  { domain: "crm", icon: Handshake, description: "Новый контакт и возможность" }, { domain: "finance", icon: CreditCard, description: "Выставить счёт клиенту" }, { domain: "projects", icon: FolderKanban, description: "Запланировать новую работу" },
];

/** Show live workspace metrics, a date-filtered cash chart and actionable module summaries. */
export function Dashboard({ state, session }: { state: WorkspaceState; session: SessionContext }) {
  const { role, can } = usePermissions();
  const [period, setPeriod] = useState<Period>("30");
  const [quickOpen, setQuickOpen] = useState(false);
  const [exportError, setExportError] = useState("");
  const now = new Date();
  const days = Number(period);
  const end = now.getTime();
  const start = end - days * 86400000;
  const previousStart = start - days * 86400000;
  const receipts = state.payments.filter((row) => new Date(row.createdAt).getTime() >= start && new Date(row.createdAt).getTime() <= end);
  const revenue = receipts.reduce((sum, row) => sum + row.amount, 0);
  const previous = state.payments.filter((row) => { const time = new Date(row.createdAt).getTime(); return time >= previousStart && time < start; }).reduce((sum, row) => sum + row.amount, 0);
  const change = previous > 0 ? Math.round((revenue - previous) / previous * 100) : null;
  const invoices = state.documents.filter((row) => row.domain === "finance");
  const deals = state.documents.filter((row) => row.domain === "crm");
  const projects = state.documents.filter((row) => row.domain === "projects");
  const activeProjects = projects.filter((row) => row.data.status !== "Завершён");
  const activeDeals = deals.filter((row) => !["Выиграна", "Проиграна"].includes(row.data.status));
  const paidFor = (id: string) => state.payments.filter((row) => row.documentId === id).reduce((sum, row) => sum + row.amount, 0);
  const unpaid = invoices.filter((row) => row.data.status !== "Черновик" && row.data.amount > paidFor(row.id));
  const outstanding = unpaid.reduce((sum, row) => sum + row.data.amount - paidFor(row.id), 0);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const overdue = unpaid.filter((row) => row.data.date && row.data.date < today);
  const buckets = days === 30 ? 8 : days === 90 ? 10 : 12;
  const chartData = Array.from({ length: buckets }, (_, index) => {
    const from = start + days * 86400000 / buckets * index;
    const to = start + days * 86400000 / buckets * (index + 1);
    const incoming = receipts.filter((row) => { const time = new Date(row.createdAt).getTime(); return time >= from && time < to; }).reduce((sum, row) => sum + row.amount, 0);
    const billed = invoices.filter((row) => { const time = new Date(row.createdAt).getTime(); return time >= from && time < to && row.data.status !== "Черновик"; }).reduce((sum, row) => sum + row.data.amount, 0);
    return { label: new Intl.DateTimeFormat("ru-RU", { day: days === 365 ? undefined : "numeric", month: "short", timeZone: "Europe/Moscow" }).format(new Date(to)), incoming: incoming / 100, billed: billed / 100 };
  });
  const won = deals.filter((row) => row.data.status === "Выиграна").length;
  const completedDeals = deals.filter((row) => ["Выиграна", "Проиграна"].includes(row.data.status)).length;
  const conversion = completedDeals ? Math.round(won / completedDeals * 100) : 0;
  const stages = ["Новая", "Переговоры", "Предложение", "Выиграна"];
  const stageTokens = ["hsl(var(--color-primary))", "hsl(var(--color-success))", "hsl(var(--color-info))", "hsl(var(--color-warning))"];

  async function handleExport() {
    if (!can("canExport")) return;
    try {
      const report = await getExportReport(period);
      if (!report.ok) { setExportError(report.error.message); return; }
      const result = downloadCsv(`evo-report-${period}-days.csv`, report.data);
      setExportError(result.ok ? "" : result.error.message);
    } catch { setExportError("Не удалось загрузить отчёт. Повторите попытку"); }
  }

  return <div className="space-y-6">
    <div className="motion flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-[11px] muted"><span className="h-px w-5 bg-[hsl(var(--color-primary))]" />ВАШ БИЗНЕС В ФОКУСЕ</div><h1 className="page-title">Всё под контролем<span className="text-[hsl(var(--color-primary))]">.</span></h1><p className="muted mt-2 text-xs">Добрый день, {session.name.split(" ")[0]}. Вот чем живёт ваше пространство.</p></div><div className="flex items-center gap-2">{can("canExport") && <Button variant="outline" onClick={handleExport}><ArrowDownToLine />Отчёт</Button>}{canWrite(role) && <Button onClick={() => setQuickOpen(true)}><Plus />Создать</Button>}</div></div>
    {exportError && <p role="alert" className="text-xs text-[hsl(var(--color-danger))]">{exportError}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-1 rounded-lg border bg-[hsl(var(--color-surface))] p-1" aria-label="Период аналитики">{([["30", "30 дней"], ["90", "Квартал"], ["365", "Год"]] as const).map(([value, label]) => <button key={value} onClick={() => setPeriod(value)} aria-pressed={period === value} className={`rounded-md px-3 py-1.5 text-[10px] font-medium transition-colors ${period === value ? "bg-[hsl(var(--color-hover))] text-[hsl(var(--color-text))]" : "text-[hsl(var(--color-muted))]"}`}>{label}</button>)}</div><span className="flex items-center gap-2 text-[11px] muted"><CalendarDays className="size-3.5" />{dateLabel(new Date(start).toISOString())} — {dateLabel(now.toISOString())}<span className="font-mono text-[10px]">{now.getFullYear()}</span></span></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: "Поступления", value: money(revenue), icon: CircleDollarSign, subtitle: change === null ? "За выбранный период" : `${change >= 0 ? "+" : ""}${change}% к предыдущему периоду`, href: "/finance", highlight: true },
        { label: "Ожидают оплаты", value: money(outstanding), icon: CreditCard, subtitle: `В ожидании: ${unpaid.length} · просрочено: ${overdue.length}`, href: "/finance", highlight: false },
        { label: "Активные сделки", value: String(activeDeals.length).padStart(2, "0"), icon: Handshake, subtitle: `В воронке ${money(activeDeals.reduce((sum, row) => sum + row.data.amount, 0), true)}`, href: "/crm", highlight: false },
        { label: "Проекты в работе", value: String(activeProjects.length).padStart(2, "0"), icon: FolderKanban, subtitle: `Завершено: ${projects.filter((row) => row.data.status === "Завершён").length} из ${projects.length}`, href: "/projects", highlight: false },
      ].map((metric, index) => <Link key={metric.label} href={metric.href} className={`panel group relative overflow-hidden p-5 transition-colors hover:border-[hsl(var(--color-border-strong))] ${metric.highlight ? "!border-[hsl(var(--color-border-strong))] !bg-[hsl(var(--color-primary-soft))]" : ""}`} style={{ animationDelay: `${index * 55}ms` }}><div className="mb-5 flex items-center justify-between"><span className="text-[11px] muted">{metric.label}</span><metric.icon className={`size-4 ${metric.highlight ? "text-[hsl(var(--color-primary))]" : "text-[hsl(var(--color-subtle))]"}`} /></div><p className="font-mono text-[27px] font-medium leading-none tracking-[-.05em]">{metric.value}</p><div className="mt-4 flex items-center justify-between"><p className={`text-[10px] ${metric.highlight ? "text-[hsl(var(--color-primary))]" : "text-[hsl(var(--color-muted))]"}`}>{metric.highlight && <span className="mr-1.5 inline-block size-1.5 rounded-full bg-[hsl(var(--color-primary))]" />}{metric.subtitle}</p><ArrowUpRight className="size-3.5 text-[hsl(var(--color-subtle))] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div></Link>)}
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.9fr)_minmax(280px,1fr)]">
      <section className="panel min-w-0 overflow-hidden p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-medium">Финансовый пульс</h2><p className="muted mt-1 text-[10px]">Поступления и выставленные счета</p></div><div className="flex gap-4 pt-1 text-[10px] muted"><span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[hsl(var(--color-primary))]" />Поступления</span><span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[hsl(var(--color-subtle))]" />Счета</span></div></div><div className="mb-3 mt-6 flex items-baseline gap-3"><span className="font-mono text-[30px] font-medium tracking-[-.05em]">{money(revenue)}</span><span className="text-[10px] muted">за {days} дней</span></div><div className="h-[225px] w-full" aria-label="График поступлений и счетов в рублях" role="img"><ResponsiveContainer width="100%" height="100%" minWidth={0}><AreaChart data={chartData} margin={{ top: 12, right: 3, left: -20, bottom: 0 }}><defs><linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--color-primary))" stopOpacity={0.17} /><stop offset="100%" stopColor="hsl(var(--color-primary))" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="hsl(var(--color-grid))" strokeDasharray="3 5" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--color-subtle))", fontSize: 9 }} dy={10} minTickGap={25} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--color-subtle))", fontSize: 9 }} tickFormatter={(value: number) => value >= 1000000 ? `${value / 1000000}м` : `${value / 1000}к`} /><Tooltip contentStyle={{ background: "hsl(var(--color-surface-raised))", border: "1px solid hsl(var(--color-border))", borderRadius: 10, color: "hsl(var(--color-text))", fontSize: 11 }} formatter={(value: number, name: string) => [money(value * 100), name === "incoming" ? "Поступления" : "Счета"]} /><Area type="monotone" dataKey="billed" stroke="hsl(var(--color-subtle))" strokeDasharray="4 5" strokeWidth={1.5} fill="var(--color-transparent)" isAnimationActive={false} /><Area type="monotone" dataKey="incoming" stroke="hsl(var(--color-primary))" strokeWidth={2} fill="url(#revenue-fill)" isAnimationActive={false} /></AreaChart></ResponsiveContainer></div></section>
      <section className="panel p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-sm font-medium">Воронка продаж</h2><Link href="/crm" aria-label="Открыть CRM" className="muted"><ArrowUpRight className="size-4" /></Link></div><p className="muted mt-1 text-[10px]">Каждая возможность имеет значение</p><div className="my-5 flex items-center gap-5"><div className="relative size-[116px] shrink-0"><svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-label={`Конверсия закрытых сделок: ${conversion}%`} role="img"><circle cx="60" cy="60" r="49" fill="none" stroke="hsl(var(--color-hover))" strokeWidth="9" /><circle cx="60" cy="60" r="49" fill="none" stroke="hsl(var(--color-primary))" strokeWidth="9" strokeDasharray={`${conversion / 100 * 308} 308`} strokeLinecap="round" /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="font-mono text-[26px] font-medium tracking-[-.06em]">{conversion}%</span><span className="text-[8px] muted">конверсия</span></div></div><div><p className="font-mono text-[26px] font-medium">{deals.length.toString().padStart(2, "0")}</p><p className="mt-1 text-[10px] muted">всего сделок</p><p className="mt-3 text-[10px] text-[hsl(var(--color-primary))]">{won} успешно закрыто</p></div></div><div className="space-y-3.5">{stages.map((stage, index) => { const count = deals.filter((row) => row.data.status === stage).length; return <div key={stage}><div className="mb-1.5 flex items-center justify-between text-[10px]"><span className="muted">{stage}</span><span className="font-mono">{count.toString().padStart(2, "0")}</span></div><div className="h-1 overflow-hidden rounded-full bg-[hsl(var(--color-hover))]"><div className="h-full rounded-full" style={{ width: `${deals.length ? count / deals.length * 100 : 0}%`, background: stageTokens[index] }} /></div></div>; })}</div><Link href="/crm" className="mt-5 flex items-center justify-between border-t pt-4 text-[10px] text-[hsl(var(--color-muted))]">Все сделки<ArrowRight className="size-3" /></Link></section>
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.9fr)_minmax(280px,1fr)]">
      <section className="panel min-w-0 overflow-hidden"><div className="flex items-center justify-between px-5 py-5 sm:px-6"><div className="flex items-center gap-2"><h2 className="text-sm font-medium">Последние счета</h2><span className="rounded-md border px-1.5 py-0.5 font-mono text-[9px] muted">{invoices.length}</span></div><Link href="/finance" className="flex items-center gap-1.5 text-[10px] muted">Все счета<ArrowUpRight className="size-3" /></Link></div><div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="table-heading">Счёт / клиент</th><th className="table-heading">Срок оплаты</th><th className="table-heading">Статус</th><th className="table-heading !text-right">Сумма</th></tr></thead><tbody>{invoices.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map((row) => <tr key={row.id} className="border-t transition-colors hover:bg-[hsl(var(--color-surface-raised))]"><td className="table-cell"><Link href={`/finance?q=${encodeURIComponent(row.data.title)}`} className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-lg border bg-[hsl(var(--color-surface-raised))]"><CreditCard className="size-3.5 muted" /></span><span><span className="block font-mono text-[10px]">{row.data.title}</span><span className="mt-0.5 block text-[10px] muted">{row.data.subtitle}</span></span></Link></td><td className="table-cell !text-[10px] muted">{dateLabel(row.data.date)}</td><td className="table-cell"><Badge status={row.data.status} /></td><td className="table-cell !text-right font-mono !text-[11px]">{money(row.data.amount)}</td></tr>)}</tbody></table>{!invoices.length && <EmptyState title="Пока нет счетов" />}</div></section>
      <section className="panel p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-sm font-medium">Ритм команды</h2><Activity className="size-4 text-[hsl(var(--color-subtle))]" /></div>{state.events.length ? <div className="space-y-5">{state.events.slice(0, 4).map((event, index) => <div key={event.id} className="relative flex gap-3">{index < 3 && <span className="absolute left-[14px] top-8 h-8 border-l" />}<span className="avatar z-10 size-[29px] !text-[8px]">{initials(event.actor)}</span><div className="min-w-0"><p className="text-[10px] leading-relaxed"><span className="font-medium">{event.actor.split(" ")[0]}</span><span className="muted"> {event.action === "payment" ? "зарегистрировал(а) оплату" : event.action === "created" ? "добавил(а) запись" : event.action === "deleted" ? "удалил(а) запись" : "обновил(а) запись"}</span></p><Link href={`/${event.domain}`} className="mt-0.5 block truncate text-[10px] text-[hsl(var(--color-primary))]">{event.title}</Link><p className="mt-1 text-[9px] text-[hsl(var(--color-subtle))]">{dateLabel(event.createdAt)} · {modules[event.domain].title}</p></div></div>)}</div> : <EmptyState title="Пока нет событий" />}</section>
    </div>
    <section className="panel app-grid flex flex-wrap items-center justify-between gap-4 !bg-[hsl(var(--color-primary-soft))] px-6 py-5"><div className="flex items-center gap-4"><span className="flex size-10 items-center justify-center rounded-xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-surface))]"><Sparkles className="size-5 text-[hsl(var(--color-primary))]" /></span><div><h2 className="text-sm font-medium">Следующий шаг — ближе, чем кажется</h2><p className="muted mt-1 text-[10px]">{overdue.length ? `Счета требуют внимания: ${overdue.length}. Проверьте сроки и зарегистрируйте поступления.` : "Проверьте ближайшие дедлайны и помогите проектам двигаться вперёд."}</p></div></div><Button variant="outline" size="sm" asChild><Link href={overdue.length ? "/finance" : "/projects"}>Посмотреть<ArrowRight /></Link></Button></section>
    <Dialog open={quickOpen} onOpenChange={setQuickOpen}><DialogContent><DialogTitle className="text-lg font-medium">Что создадим?</DialogTitle><DialogDescription className="mb-5 mt-2 text-xs muted">Выберите модуль — откроется форма новой записи.</DialogDescription><div className="space-y-2">{quickLinks.map((item) => <Link key={item.domain} href={`/${item.domain}?create=1`} onClick={() => setQuickOpen(false)} className="flex items-center gap-4 rounded-xl border p-4 hover:bg-[hsl(var(--color-hover))]"><item.icon className="size-5 text-[hsl(var(--color-primary))]" /><div><p className="text-sm font-medium">{modules[item.domain].title}</p><p className="muted mt-1 text-xs">{item.description}</p></div><ArrowUpRight className="ml-auto size-4 muted" /></Link>)}</div></DialogContent></Dialog>
  </div>;
}
