"use client";
import { useConfiguration } from "@/modules/settings/configuration-provider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/i18n/use-i18n";


import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Layers3, LogOut, X } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NAVIGATION_GROUPS, isNavigationActive } from "@/components/layout/navigation";
import { ROLE_LABELS } from "@/lib/permissions";
import { cn, initials } from "@/lib/utils";
import type { Result, SessionContext } from "@/types/shared";
import type { InventoryStockAlert } from "@/modules/inventory/types";
import { getInventoryStockAlert } from "@/modules/inventory/actions";

import { useLeavePendingCount } from "@/modules/hr/use-leave-pending-count";

/** Group module links and move one shared indicator between the active rows. */
function SidebarNavigation({ pathname, collapsed, projectCount, inventoryAlert, leavePending, onNavigate }: { pathname: string; collapsed: boolean; projectCount: number | null; inventoryAlert: Result<InventoryStockAlert> | null; leavePending: Result<number> | null; onNavigate: () => void }) {
  const { t } = useI18n();

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

  return <nav ref={navigationRef} aria-label={t("Основная навигация")} className="shell-navigation">
    <span aria-hidden="true" data-active-indicator className="shell-active-indicator" style={{ transform: `translateY(${indicatorTop ?? 0}px)`, opacity: indicatorTop === null ? 0 : 1 }} />
    {NAVIGATION_GROUPS.map((group) => <section key={group.label} className="shell-nav-group" aria-label={t(group.label)}>
      <h2 className={cn("shell-group-label eyebrow", collapsed && "shell-group-label-collapsed")}><span className={collapsed ? "sr-only" : undefined}>{t(group.label)}</span>{collapsed && <span aria-hidden="true" className="h-px w-5 bg-border" />}</h2>
      <ul className="space-y-1">{group.items.map((item) => {
        const stockHint = item.href === "/inventory" && inventoryAlert ? inventoryAlert.ok ? t`Требуют пополнения: ${inventoryAlert.data.total}. Низкий запас: ${inventoryAlert.data.lowStock}, нет в наличии: ${inventoryAlert.data.outOfStock}` : t("Остатки недоступны. Обновите каталог") : "";
        const showStockAlert = item.href === "/inventory" && inventoryAlert && (!inventoryAlert.ok || inventoryAlert.data.total > 0);
        const leaveHint = item.href === "/hr" && leavePending ? leavePending.ok ? t`Ожидают согласования отпусков: ${leavePending.data}` : t("Согласования недоступны. Обновите отпуска") : "";
        const hint = stockHint || leaveHint;
        const link = <Link href={item.href} aria-label={hint ? `${t(item.label)}. ${hint}` : t(item.label)} title={hint || undefined} aria-current={isNavigationActive(pathname, item.href) ? "page" : undefined} onClick={onNavigate} className={cn("relative shell-nav-link nav-link", collapsed && "shell-nav-link-collapsed", isNavigationActive(pathname, item.href) && "active")}>
          <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
          <span className={collapsed ? "sr-only" : "truncate"}>{t(item.label)}</span>
          {item.href === "/projects" && projectCount !== null && !collapsed && <span className="ml-auto rounded border px-1.5 py-0.5 font-mono text-[9px] muted">{projectCount}</span>}
          {showStockAlert && <span aria-hidden="true" data-inventory-alert className={cn("motion-fade rounded border border-warning/30 bg-warning/10 px-1.5 py-0.5 font-mono text-[10px] text-warning", collapsed ? "absolute -right-1 -top-1 px-1" : "ml-auto")}>{inventoryAlert.ok ? inventoryAlert.data.total > 99 ? "99+" : inventoryAlert.data.total : "!"}</span>}
          {item.href === "/hr" && leavePending && (!leavePending.ok || leavePending.data > 0) && <span aria-hidden="true" data-leave-pending className={cn("motion-fade rounded border border-warning/30 bg-warning/10 px-1.5 py-0.5 font-mono text-[10px] text-warning", collapsed ? "absolute -right-1 -top-1 px-1" : "ml-auto")}>{leavePending.ok ? leavePending.data > 99 ? "99+" : leavePending.data : "!"}</span>}
        </Link>;
        return <li key={item.href}>{collapsed ? <Tooltip><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right">{hint ? `${t(item.label)} · ${hint}` : t(item.label)}</TooltipContent></Tooltip> : link}</li>;
      })}</ul>
    </section>)}
  </nav>;
}

/** Responsive shared Sidebar primitive with compact desktop and full mobile navigation. */
export function AppSidebar({ pathname, session, projectCount, inventoryAlert: initialAlert, leavePending: initialPending, onWorkspaceOpen, onSignOut }: { pathname: string; session: SessionContext; projectCount: number; inventoryAlert: Result<InventoryStockAlert> | null; leavePending: Result<number> | null; onWorkspaceOpen: () => void; onSignOut: () => void }) {
  const { t } = useI18n();

  const { settings } = useConfiguration();
  const leavePending = useLeavePendingCount(initialPending, pathname);
  const [inventoryAlert, setInventoryAlert] = useState(initialAlert), request = useRef(0), lastPath = useRef(pathname);
  const enabled = initialAlert !== null;
  useEffect(() => { request.current++; setInventoryAlert(initialAlert); }, [initialAlert]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    function handleRefreshStock() {
      const sequence = ++request.current;
      getInventoryStockAlert().then((result) => { if (active && sequence === request.current) setInventoryAlert(result); }).catch(() => { if (active && sequence === request.current) setInventoryAlert({ ok: false, error: { code: "STORAGE", message: t("Остатки недоступны") } }); });
    }
    if (lastPath.current !== pathname) { lastPath.current = pathname; handleRefreshStock(); }
    window.addEventListener("focus", handleRefreshStock);
    return () => { active = false; window.removeEventListener("focus", handleRefreshStock); };
  }, [pathname, enabled]);
  const sidebar = useSidebar();
  if (!sidebar.ok) return null;
  const { state, isMobile, setOpenMobile } = sidebar.data;
  const collapsed = state === "collapsed" && !isMobile;
  function handleNavigate() { setOpenMobile(false); }
  function handleWorkspaceOpen() { setOpenMobile(false); onWorkspaceOpen(); }

  return <Sidebar collapsible="icon" className="shell-sidebar">
    <div id="workspace-sidebar" role="complementary" aria-label={t("Боковая панель")} className="flex h-full min-h-0 flex-col" data-collapsed={collapsed}>
      <SidebarHeader className={cn("!gap-0 !p-4", collapsed && "!px-3")}>
        <div className="mb-5 flex h-10 items-center justify-between">
          <Link href="/" onClick={handleNavigate} className="motion flex min-w-0 items-center gap-2.5 rounded-lg p-1" aria-label={t("Evo ERP — главная")}><span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary text-primary-foreground"><Layers3 className="size-5" strokeWidth={2.5} /></span><span className={cn("whitespace-nowrap text-[23px] font-semibold tracking-[-.06em]", collapsed && "sr-only")}>{t("evo")}<span className="ml-1.5 text-[10px] font-medium uppercase tracking-[.14em] muted">{t("ERP")}</span></span></Link>
          {isMobile && <Button variant="ghost" size="icon" className="!size-11" onClick={handleNavigate} aria-label={t("Закрыть меню")}><X /></Button>}
        </div>
        <button onClick={handleWorkspaceOpen} aria-label={t`Рабочее пространство: ${settings.companyName}`} title={collapsed ? settings.companyName : undefined} className={cn("motion flex h-16 w-full items-center gap-2.5 rounded-xl border bg-surface p-3 text-left transition-colors hover:bg-accent", collapsed && "!h-12 justify-center !gap-0 !p-0")}><Avatar className="size-8 shrink-0 rounded-lg"><AvatarImage src={settings.logo ?? undefined} alt="" className="object-contain" /><AvatarFallback>{initials(settings.companyName)}</AvatarFallback></Avatar><span className={collapsed ? "sr-only" : "min-w-0 flex-1"}><span className="block truncate text-xs font-medium">{settings.companyName}</span><span className="mt-1 block text-[10px] muted">{t("Рабочее пространство")}</span></span>{!collapsed && <ChevronDown className="size-3 shrink-0 muted" />}</button>
      </SidebarHeader>
      <SidebarContent className="!overflow-x-hidden !overflow-y-auto"><SidebarNavigation pathname={pathname} collapsed={collapsed} projectCount={pathname.startsWith("/projects/documents") ? projectCount : null} inventoryAlert={inventoryAlert} leavePending={leavePending} onNavigate={handleNavigate} /></SidebarContent>
      <SidebarFooter className={cn("!gap-3 border-t !p-4", collapsed && "items-center !px-2")}>
        <div className={cn("flex min-w-0 items-center gap-2.5", collapsed && "flex-col gap-3")}><Link href="/settings" onClick={handleNavigate} className="avatar size-9" aria-label={t("Настройки профиля")} title={session.name}>{initials(session.name)}</Link><div className={collapsed ? "sr-only" : "min-w-0 flex-1"}><p className="truncate text-[11px] font-medium">{session.name}</p><p className="mt-1 text-[10px] muted">{t(ROLE_LABELS[session.role])}</p></div><Button variant="ghost" size="icon" onClick={onSignOut} aria-label={t("Выйти")} title={t("Выйти")}><LogOut className="!size-4" /></Button></div>
      </SidebarFooter>
    </div>
  </Sidebar>;
}
