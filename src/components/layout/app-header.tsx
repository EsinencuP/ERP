"use client";
import { useI18n } from "@/i18n/use-i18n";


import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Bell, ChevronRight, Command, Moon, Search, Sun, SunMoon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { NAVIGATION_GROUPS, isNavigationActive } from "@/components/layout/navigation";
import { initials } from "@/lib/utils";
import type { SessionContext } from "@/types/shared";

/** Shared Header with responsive sidebar control, breadcrumbs, search and persistent theme toggle. */
export function AppHeader({ pathname, session, hasNotifications, onSearchOpen, onNotificationsOpen }: { pathname: string; session: SessionContext; hasNotifications: boolean; onSearchOpen: () => void; onNotificationsOpen: () => void }) {
  const { t } = useI18n();

  const sidebar = useSidebar();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const dark = resolvedTheme === "dark";
  const group = NAVIGATION_GROUPS.find((item) => item.items.some((link) => isNavigationActive(pathname, link.href)));
  const active = group?.items.find((item) => isNavigationActive(pathname, item.href));
  function handleThemeToggle() { setTheme(dark ? "light" : "dark"); }
  if (!sidebar.ok) return null;
  const { isMobile, openMobile, open } = sidebar.data;
  const toggleLabel = isMobile ? t("Открыть меню") : open ? t("Свернуть боковую панель") : t("Развернуть боковую панель");

  return <header className="shell-header motion-fade sticky top-0 z-20 flex h-[72px] items-center justify-between gap-2 border-b bg-[hsl(var(--color-glass))] px-4 backdrop-blur-xl sm:px-6 lg:px-8">
    <div className="flex min-w-0 items-center gap-2 sm:gap-3"><SidebarTrigger id="sidebar-toggle" className="!size-11" aria-label={toggleLabel} title={toggleLabel} aria-expanded={isMobile ? openMobile : open} aria-controls="workspace-sidebar" /><nav aria-label={t("Текущий раздел")} className="flex min-w-0 items-center gap-2"><span className="hidden text-xs muted lg:block">{t(group?.label ?? "System")}</span><ChevronRight className="hidden size-3 shrink-0 muted lg:block" aria-hidden="true" /><span className="truncate text-xs font-medium" aria-current="page">{t(active?.label ?? "Дизайн-система")}</span></nav></div>
    <div className="flex shrink-0 items-center gap-1 sm:gap-2"><button onClick={onSearchOpen} aria-label={t("Поиск по рабочему пространству")} className="motion flex size-11 items-center justify-center gap-2 rounded-lg border bg-surface text-[11px] muted transition-colors hover:bg-accent md:h-10 md:w-[200px] md:justify-start md:px-3"><Search className="size-4" aria-hidden="true" /><span className="hidden min-w-0 flex-1 truncate md:block">{t("Найти в пространстве…")}</span><kbd className="ml-auto hidden shrink-0 items-center gap-0.5 rounded border px-1 py-0.5 font-mono text-[9px] md:flex"><Command className="size-2.5" />K</kbd></button><Button variant="ghost" size="icon" className="!size-11" onClick={handleThemeToggle} aria-label={t("Переключить тему")} aria-pressed={mounted ? dark : undefined} title={mounted ? dark ? t("Включить светлую тему") : t("Включить тёмную тему") : t("Переключить тему")}>{!mounted ? <SunMoon /> : dark ? <Sun /> : <Moon />}</Button><Button variant="ghost" size="icon" aria-label={t("Последние события")} onClick={onNotificationsOpen} className="relative !size-11"><Bell className="!size-4" />{hasNotifications && <span className="absolute right-2.5 top-2 size-1.5 rounded-full bg-primary" />}</Button><Link href="/settings" className="avatar ml-1 size-9" aria-label={t("Настройки профиля")}>{initials(session.name)}</Link></div>
  </header>;
}
