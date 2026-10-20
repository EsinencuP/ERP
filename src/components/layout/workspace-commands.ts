import { canWrite, hasPermission } from "@/lib/permissions";
import type { Role } from "@/types/shared";

const CREATE_COMMANDS = [
  { href: "/crm", label: "New deal" },
  { href: "/crm/contacts", label: "New contact" },
  { href: "/finance", label: "New invoice" },
  { href: "/finance/payments", label: "Record payment" },
  { href: "/finance/expenses", label: "New expense" },
  { href: "/inventory", label: "New product" },
  { href: "/inventory/warehouses", label: "New warehouse" },
  { href: "/hr", label: "New employee" },
  { href: "/hr/leaves", label: "New leave request" },
  { href: "/projects", label: "New task" },
  { href: "/projects/overview", label: "New project" },
] as const;

/** Offer creation only to roles allowed to write; server actions remain authoritative. */
export function getCreateCommands(role: Role) {
  return canWrite(role) ? [...CREATE_COMMANDS, ...(hasPermission(role, "canManageUsers") ? [{ href: "/settings/users", label: "Invite member" }] : [])] : [];
}

/** Resolve a nested overview/detail route to its module's primary creation workflow. */
export function getContextCreateCommand(pathname: string, role: Role) {
  const commands = getCreateCommands(role);
  return commands.find((item) => item.href === pathname) ?? commands.find((item) => item.href !== "/crm" && pathname.startsWith(`${item.href}/`)) ?? (pathname.startsWith("/crm/") ? commands.find((item) => item.href === "/crm") : undefined);
}
