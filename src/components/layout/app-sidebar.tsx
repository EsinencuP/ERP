"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Layers3, LogOut, X } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NAVIGATION_GROUPS, isNavigationActive } from "@/components/layout/navigation";
import { ROLE_LABELS } from "@/lib/permissions";
import { cn, initials } from "@/lib/utils";
import type { SessionContext } from "@/types/shared";

/** Group module links and move one shared indicator between the active rows. */
function SidebarNavigation({ pathname, collapsed, projectCount, onNavigate }: { pathname: string; collapsed: boolean; projectCount: number; onNavigate: () => void }) {
  const navigationRef = useRef<HTMLElement>(null);
  const [indicatorTop, setIndicatorTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;
    function handleIndicatorUpdate() {
      const active = navigation?.querySelector<HTMLAnchorElement>('[aria-current="page"]');
      setIndicatorTop(active && navigation ? active.getBoundingClientRect().top - navigation.getBoundingClientRect().top + (active.offsetHeight - 22) / 2 : null);
    }
    handleIndicatorUpdate();
    const observer = new ResizeObserver(handleIndicatorUpdate);
    observer.observe(navigation);
    return () => observer.disconnect();
  }, [pathname, collapsed]);

  return <nav ref={navigationRef} aria-label="Основная навигация" className="shell-navigation">
    <span aria-hidden="true" data-active-indicator className="shell-active-indicator" style={{ transform: `translateY(${indicatorTop ?? 0}px)`, opacity: indicatorTop === null ? 0 : 1 }} />
    {NAVIGATION_GROUPS.map((group) => <section key={group.label} className="shell-nav-group" aria-label={group.label}>
      <h2 className={cn("shell-group-label eyebrow", collapsed && "shell-group-label-collapsed")}><span className={collapsed ? "sr-only" : undefined}>{group.label}</span>{collapsed && <span aria-hidden="true" className="h-px w-5 bg-border" />}</h2>
      <ul className="space-y-1">{group.items.map((item) => {
        const link = <Link href={item.href} aria-label={item.label} aria-current={isNavigationActive(pathname, item.href) ? "page" : undefined} onClick={onNavigate} className={cn("shell-nav-link nav-link", collapsed && "shell-nav-link-collapsed", isNavigationActive(pathname, item.href) && "active")}>
          <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
          <span className={collapsed ? "sr-only" : "truncate"}>{item.label}</span>
          {item.href === "/projects" && !collapsed && <span className="ml-auto rounded border px-1.5 py-0.5 font-mono text-[9px] muted">{projectCount}</span>}
        </Link>;
        return <li key={item.href}>{collapsed ? <Tooltip><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right">{item.label}</TooltipContent></Tooltip> : link}</li>;
      })}</ul>
    </section>)}
  </nav>;
}

/** Responsive shared Sidebar primitive with compact desktop and full mobile navigation. */
export function AppSidebar({ pathname, session, projectCount, onWorkspaceOpen, onSignOut }: { pathname: string; session: SessionContext; projectCount: number; onWorkspaceOpen: () => void; onSignOut: () => void }) {
  const sidebar = useSidebar();
  if (!sidebar.ok) return null;
  const { state, isMobile, setOpenMobile } = sidebar.data;
  const collapsed = state === "collapsed" && !isMobile;
  function handleNavigate() { setOpenMobile(false); }
  function handleWorkspaceOpen() { setOpenMobile(false); onWorkspaceOpen(); }

  return <Sidebar collapsible="icon" className="shell-sidebar">
    <div id="workspace-sidebar" role="complementary" aria-label="Боковая панель" className="flex h-full min-h-0 flex-col" data-collapsed={collapsed}>
      <SidebarHeader className={cn("!gap-0 !p-4", collapsed && "!px-3")}>
        <div className="mb-5 flex h-10 items-center justify-between">
          <Link href="/" onClick={handleNavigate} className="motion flex min-w-0 items-center gap-2.5 rounded-lg p-1" aria-label="Evo ERP — главная"><span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary text-primary-foreground"><Layers3 className="size-5" strokeWidth={2.5} /></span><span className={cn("whitespace-nowrap text-[23px] font-semibold tracking-[-.06em]", collapsed && "sr-only")}>evo<span className="ml-1.5 text-[10px] font-medium uppercase tracking-[.14em] muted">ERP</span></span></Link>
          {isMobile && <Button variant="ghost" size="icon" className="!size-11" onClick={handleNavigate} aria-label="Закрыть меню"><X /></Button>}
        </div>
        <button onClick={handleWorkspaceOpen} aria-label={`Рабочее пространство: ${session.workspaceName}`} title={collapsed ? session.workspaceName : undefined} className={cn("motion flex h-16 w-full items-center gap-2.5 rounded-xl border bg-surface p-3 text-left transition-colors hover:bg-accent", collapsed && "!h-12 justify-center !gap-0 !p-0")}><span className="avatar size-8 shrink-0 rounded-lg text-[11px]">{initials(session.workspaceName)}</span><span className={collapsed ? "sr-only" : "min-w-0 flex-1"}><span className="block truncate text-xs font-medium">{session.workspaceName}</span><span className="mt-1 block text-[10px] muted">Рабочее пространство</span></span>{!collapsed && <ChevronDown className="size-3 shrink-0 muted" />}</button>
      </SidebarHeader>
      <SidebarContent className="!overflow-x-hidden !overflow-y-auto"><SidebarNavigation pathname={pathname} collapsed={collapsed} projectCount={projectCount} onNavigate={handleNavigate} /></SidebarContent>
      <SidebarFooter className={cn("!gap-3 border-t !p-4", collapsed && "items-center !px-2")}>
        <div className={cn("flex min-w-0 items-center gap-2.5", collapsed && "flex-col gap-3")}><Link href="/settings" onClick={handleNavigate} className="avatar size-9" aria-label="Настройки профиля" title={session.name}>{initials(session.name)}</Link><div className={collapsed ? "sr-only" : "min-w-0 flex-1"}><p className="truncate text-[11px] font-medium">{session.name}</p><p className="mt-1 text-[10px] muted">{ROLE_LABELS[session.role]}</p></div><Button variant="ghost" size="icon" onClick={onSignOut} aria-label="Выйти" title="Выйти"><LogOut className="!size-4" /></Button></div>
      </SidebarFooter>
    </div>
  </Sidebar>;
}
