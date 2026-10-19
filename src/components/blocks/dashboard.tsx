"use client";
import { useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, CreditCard, FolderKanban, Handshake, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/feedback";
import { dateLabel, initials } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { canWrite } from "@/lib/permissions";
import { modules } from "@/lib/modules";
import { FinanceDashboard } from "@/modules/finance/components/finance-dashboard";
import type { FinanceDashboardData } from "@/modules/finance/types";
import type { Result, SessionContext, WorkspaceState } from "@/types/shared";

const quickLinks = [
  { href: "/crm/contacts", icon: Handshake, title: "Клиенты", description: "Открыть контакты CRM" },
  { href: "/finance", icon: CreditCard, title: "Счета", description: "Открыть счета и создать черновик" },
  { href: "/projects?create=1", icon: FolderKanban, title: "Проекты", description: "Запланировать новую работу" },
];

/** Combine normalized finance KPIs/charts with existing operational summaries and audit activity. */
export function Dashboard({ state, session, finance }: { state: WorkspaceState; session: SessionContext; finance: Result<FinanceDashboardData> }) {
  const { role } = usePermissions(), [quickOpen, setQuickOpen] = useState(false);
  const deals = state.documents.filter((row) => row.domain === "crm"), projects = state.documents.filter((row) => row.domain === "projects");
  const activeDeals = deals.filter((row) => !["Выиграна", "Проиграна"].includes(row.data.status)).length;
  const activeProjects = projects.filter((row) => row.data.status !== "Завершён").length;
  return <div className="min-w-0 space-y-7">
    <header className="motion-fade flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-3 text-muted-foreground">ВАШ БИЗНЕС В ФОКУСЕ</p><h1 className="page-title">Всё под контролем<span className="text-primary">.</span></h1><p className="mt-2 text-xs text-muted-foreground">Добрый день, {session.name.split(" ")[0]}. Вот чем живёт ваше пространство.</p></div><div className="flex gap-2"><Button asChild variant="outline"><Link href="/finance/payments"><CreditCard />Платежи</Link></Button>{canWrite(role) && <Button onClick={function handleCreate() { setQuickOpen(true); }}><Plus />Создать</Button>}</div></header>
    <FinanceDashboard initialData={finance} />
    <div className="grid min-w-0 gap-5 xl:grid-cols-2"><section className="motion-fade panel p-5 sm:p-6"><h2 className="text-sm font-semibold">Операционная сводка</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">{[{ href: "/crm", label: "Активные сделки", value: activeDeals, total: deals.length, icon: Handshake }, { href: "/projects", label: "Проекты в работе", value: activeProjects, total: projects.length, icon: FolderKanban }].map((item) => <Link key={item.href} href={item.href} className="motion-fade rounded-xl border p-4 transition-colors hover:bg-accent"><div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{item.label}</span><item.icon className="size-4 text-primary" /></div><p className="mt-4 font-mono text-3xl font-semibold">{item.value}</p><p className="mt-3 flex items-center justify-between text-xs text-muted-foreground">Всего: {item.total}<ArrowRight className="size-3" /></p></Link>)}</div></section>
      <section className="motion-fade panel min-w-0 p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Ритм команды</h2><Activity className="size-4 text-muted-foreground" /></div>{state.events.length ? <ul className="mt-5 space-y-5">{state.events.slice(0, 4).map((event) => <li key={event.id} className="motion-fade flex gap-3"><span className="avatar size-8 shrink-0 text-[9px]">{initials(event.actor)}</span><div className="min-w-0"><p className="text-xs"><span className="font-medium">{event.actor.split(" ")[0]}</span><span className="text-muted-foreground"> {event.action === "payment" ? "зарегистрировал(а) оплату" : event.action === "created" ? "добавил(а) запись" : event.action === "deleted" ? "удалил(а) запись" : "обновил(а) запись"}</span></p><Link href={`/${event.domain}`} className="mt-1 block truncate text-xs text-primary hover:underline">{event.title}</Link><p className="mt-1 text-[10px] text-muted-foreground">{dateLabel(event.createdAt)} · {modules[event.domain].title}</p></div></li>)}</ul> : <EmptyState title="Пока нет событий" />}</section>
    </div>
    <Dialog open={quickOpen} onOpenChange={setQuickOpen}><DialogContent><DialogTitle>Что создадим?</DialogTitle><DialogDescription className="mb-5 mt-2 text-xs text-muted-foreground">Выберите раздел рабочего пространства.</DialogDescription><div className="space-y-2">{quickLinks.map((item) => <Link key={item.href} href={item.href} onClick={function handleNavigate() { setQuickOpen(false); }} className="motion-fade flex items-center gap-4 rounded-xl border p-4 hover:bg-accent"><item.icon className="size-5 text-primary" /><span><span className="block text-sm font-medium">{item.title}</span><span className="mt-1 block text-xs text-muted-foreground">{item.description}</span></span><ArrowRight className="ml-auto size-4" /></Link>)}</div></DialogContent></Dialog>
  </div>;
}
