import { Box, CreditCard, FolderKanban, LayoutDashboard, Settings2, Users, type LucideIcon } from "lucide-react";

type NavigationItem = { href: string; label: string; icon: LucideIcon };
type NavigationGroup = { label: string; items: readonly NavigationItem[] };

/** Shared module menu used by Sidebar, Header breadcrumbs and global search. */
export const NAVIGATION_GROUPS: readonly NavigationGroup[] = [
  { label: "Overview", items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  { label: "Business", items: [{ href: "/crm", label: "CRM", icon: Users }, { href: "/finance", label: "Finance", icon: CreditCard }, { href: "/inventory", label: "Inventory", icon: Box }] },
  { label: "Operations", items: [{ href: "/hr", label: "HR", icon: Users }, { href: "/projects", label: "Projects", icon: FolderKanban }] },
  { label: "System", items: [{ href: "/settings", label: "Settings", icon: Settings2 }] },
];

export const NAVIGATION_ITEMS = NAVIGATION_GROUPS.flatMap((group) => group.items);

/** Match the dashboard exactly and keep a module active for its nested routes. */
export function isNavigationActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}
