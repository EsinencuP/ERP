import type { DashboardActivity } from "./types";

export const DASHBOARD_DOMAINS: Readonly<Record<string, { label: string; href: string }>> = { crm: { label: "CRM", href: "/crm/pipeline" }, finance: { label: "Finance", href: "/finance" }, inventory: { label: "Inventory", href: "/inventory" }, hr: { label: "HR", href: "/hr" }, projects: { label: "Projects", href: "/projects/overview" } };
export const DASHBOARD_ACTIONS: Readonly<Record<string, string>> = { created: "добавил(а) запись", updated: "обновил(а) запись", deleted: "удалил(а) запись", payment: "зарегистрировал(а) оплату", approved: "согласовал(а) заявку", rejected: "отклонил(а) заявку" };

/** Link recognized audit entities safely, routing deletions and unsupported entity types to their module. */
export function getDashboardActivityLink(event: Pick<DashboardActivity, "domain" | "entityType" | "entityId" | "action">): string | null {
  const domain = Object.hasOwn(DASHBOARD_DOMAINS, event.domain) ? DASHBOARD_DOMAINS[event.domain] : undefined; if (!domain) return null;
  if (!event.entityId || event.action === "deleted") return domain.href;
  const id = encodeURIComponent(event.entityId);
  if (event.domain === "finance" && event.entityType === "Invoice") return `/finance/${id}`;
  if (event.domain === "finance" && event.entityType === "Expense") return "/finance/expenses";
  if (event.domain === "crm" && event.entityType === "Contact") return `/crm/contacts/${id}`;
  if (event.domain === "inventory" && event.entityType === "Product") return `/inventory/${id}`;
  if (event.domain === "hr" && event.entityType === "Employee") return `/hr/${id}`;
  if (event.domain === "hr" && event.entityType === "Leave") return "/hr/leaves";
  if (event.domain === "projects" && event.entityType === "Project") return `/projects/overview?projectId=${id}`;
  return domain.href;
}
