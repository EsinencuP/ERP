"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, ArrowUpRight, ChevronRight, Search, ShieldCheck } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { NAVIGATION_ITEMS } from "@/components/layout/navigation";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/feedback";
import { deleteSession } from "@/lib/auth-actions";
import { dateLabel } from "@/lib/utils";
import { modules } from "@/lib/modules";
import type { SessionContext, WorkspaceState } from "@/types/shared";

type AppShellProps = { session: SessionContext; state: WorkspaceState; children: React.ReactNode; defaultSidebarOpen?: boolean };

/** Keep Sidebar state across route changes and hydrate its non-sensitive saved preference. */
export function AppShell({ defaultSidebarOpen = true, ...props }: AppShellProps) {
  return <SidebarProvider defaultOpen={defaultSidebarOpen} style={{ "--sidebar-width": "248px", "--sidebar-width-icon": "80px" } as React.CSSProperties}><AppShellContent {...props} /></SidebarProvider>;
}

/** Compose shared navigation, Header, route content and workspace dialogs. */
function AppShellContent({ session, state, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const sidebar = useSidebar();
  const openMobile = sidebar.ok && sidebar.data.openMobile;
  const isMobile = sidebar.ok && sidebar.data.isMobile;
  const setOpenMobile = sidebar.ok ? sidebar.data.setOpenMobile : undefined;
  const wasMobileOpen = useRef(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen((open) => !open); }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  useEffect(() => { setOpenMobile?.(false); setSearchOpen(false); }, [pathname, setOpenMobile]);
  useEffect(() => { if (!isMobile) setOpenMobile?.(false); }, [isMobile, setOpenMobile]);
  useEffect(() => {
    if (wasMobileOpen.current && !openMobile && !searchOpen && !notifications && !workspaceOpen) {
      const frame = requestAnimationFrame(() => document.getElementById("sidebar-toggle")?.focus());
      wasMobileOpen.current = openMobile;
      return () => cancelAnimationFrame(frame);
    }
    wasMobileOpen.current = openMobile;
  }, [openMobile, searchOpen, notifications, workspaceOpen]);

  async function handleSignOut() {
    try {
      const result = await deleteSession();
      if (!result.ok) { setError(result.error.message); return; }
      router.push("/login"); router.refresh();
    } catch { setError("Не удалось выйти. Проверьте соединение и повторите попытку"); }
  }
  function handleWorkspaceOpen() { setWorkspaceOpen(true); }
  function handleSearchOpen() { setSearchOpen(true); }
  function handleNotificationsOpen() { setNotifications(true); }
  const results = search.trim() ? state.documents.filter((row) => `${row.data.title} ${row.data.subtitle}`.toLowerCase().includes(search.toLowerCase())).slice(0, 8) : [];
  const projectCount = state.documents.filter((row) => row.domain === "projects" && row.data.status !== "Завершён").length;

  return <>
    <AppSidebar pathname={pathname} session={session} projectCount={projectCount} onWorkspaceOpen={handleWorkspaceOpen} onSignOut={handleSignOut} />
    <div className="min-w-0 flex-1">
      <AppHeader pathname={pathname} session={session} hasNotifications={state.events.length > 0} onSearchOpen={handleSearchOpen} onNotificationsOpen={handleNotificationsOpen} />
      <main id="main-content" className="mx-auto max-w-[1640px] px-5 pb-7 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {session.demo && <div className="motion mb-6 flex flex-wrap items-center gap-2 text-[10px] tracking-wide muted"><span className="size-1.5 rounded-full bg-warning" /><span>ДЕМОПРОСТРАНСТВО</span><span>/</span><span>Учебные данные · изменения сохраняются локально</span></div>}
        {error && <p className="mb-3 text-danger" role="alert">{error}</p>}
        {children}
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-[10px] text-[hsl(var(--color-subtle))]"><span>Evo ERP <span className="mx-1">/</span> Пространство для вашего бизнеса</span><span className="flex items-center gap-1.5"><ShieldCheck className="size-3" />{session.demo ? "Локальное хранение · деморежим" : "PostgreSQL · рабочее пространство защищено"}<span className="ml-3 font-mono">v0.1.0</span></span></footer>
      </main>
    </div>
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}><DialogContent><DialogTitle className="mb-2 text-lg font-medium">Найти в пространстве</DialogTitle><DialogDescription className="mb-5 text-xs muted">Поиск по названиям и контактам всех модулей.</DialogDescription><div className="relative"><Search className="absolute left-3 top-3 size-4 muted" /><input className="input pl-10" aria-label="Поисковый запрос" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Компания, счёт, сотрудник..." /></div><div className="mt-4 space-y-1">{search.trim() ? results.length ? results.map((row) => <Link onClick={() => setSearchOpen(false)} key={row.id} href={`/${row.domain}?q=${encodeURIComponent(row.data.title)}`} className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-[hsl(var(--color-hover))]"><div><p className="text-sm">{row.data.title}</p><p className="mt-1 text-xs muted">{row.data.subtitle}</p></div><span className="text-[10px] muted">{modules[row.domain].title}</span></Link>) : <EmptyState title="Ничего не найдено" description="Попробуйте изменить поисковый запрос." /> : NAVIGATION_ITEMS.map((item) => <Link key={item.href} href={item.href} onClick={() => setSearchOpen(false)} className="nav-link"><item.icon className="size-4" />{item.label}<ChevronRight className="ml-auto size-3" /></Link>)}</div></DialogContent></Dialog>
    <Dialog open={notifications} onOpenChange={setNotifications}><DialogContent><DialogTitle className="text-lg font-medium">Последние события</DialogTitle><DialogDescription className="mb-5 mt-2 text-xs muted">Журнал действий в вашем рабочем пространстве.</DialogDescription>{state.events.length ? state.events.slice(0, 12).map((event) => <div key={event.id} className="flex gap-3 border-b py-3"><span className="avatar size-8"><Activity className="size-3" /></span><div><p className="text-xs">{event.title}</p><p className="mt-1 text-[10px] muted">{event.actor} · {dateLabel(event.createdAt)} · {event.action === "created" ? "Создание" : event.action === "payment" ? "Поступление" : event.action === "deleted" ? "Удаление" : "Изменение"}</p></div></div>) : <EmptyState title="Событий пока нет" />}</DialogContent></Dialog>
    <Dialog open={workspaceOpen} onOpenChange={setWorkspaceOpen}><DialogContent><DialogTitle className="text-lg font-medium">{session.workspaceName}</DialogTitle><DialogDescription className="mb-5 mt-2 text-xs muted">Активное рабочее пространство</DialogDescription><div className="rounded-xl border p-4 text-sm"><p className="font-mono text-xs muted">{session.workspaceId}</p><p className="mt-3">{session.demo ? "Общее локальное демопространство" : "Доступ определяется вашим членством и ролью"}</p><p className="muted mt-2 text-xs">{session.email}</p></div><Button asChild className="mt-5" variant="outline"><Link href="/settings" onClick={() => setWorkspaceOpen(false)}>Настройки пространства<ArrowUpRight /></Link></Button></DialogContent></Dialog>
  </>;
}
