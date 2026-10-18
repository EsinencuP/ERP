import type { Domain, Permission, Role } from "@/types/shared";

/** Workspace permissions; no role grants access outside its active membership. */
export const PERMISSIONS = {
  SUPER_ADMIN: { canDelete: true, canExport: true, canManageUsers: true, canViewAll: true },
  ADMIN: { canDelete: true, canExport: true, canManageUsers: true, canViewAll: true },
  MANAGER: { canDelete: true, canExport: true, canManageUsers: false, canViewAll: true },
  AGENT: { canDelete: false, canExport: false, canManageUsers: false, canViewAll: true },
  READONLY: { canDelete: false, canExport: false, canManageUsers: false, canViewAll: true },
} as const satisfies Record<Role, Readonly<Record<Permission, boolean>>>;

/** Recognize only explicit roles, including when decoding persisted JWT claims. */
export function isRole(value: unknown): value is Role { return typeof value === "string" && Object.hasOwn(PERMISSIONS, value); }

/** Deny missing/unknown roles and permission keys, including during session loading. */
export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  return isRole(role) && Object.hasOwn(PERMISSIONS[role], permission) && PERMISSIONS[role][permission] === true;
}

/** All authenticated workspace roles except READONLY may create and update documents. */
export function canWrite(role: Role | null | undefined): boolean { return isRole(role) && role !== "READONLY"; }

/** Keep the existing additional HR deletion restriction for managers. */
export function canDeleteDocument(role: Role | null | undefined, domain: Domain): boolean {
  return hasPermission(role, "canDelete") && !(role === "MANAGER" && domain === "hr");
}

/** Human-readable role names shared by navigation and settings. */
export const ROLE_LABELS: Record<Role, string> = { SUPER_ADMIN: "Суперадминистратор", ADMIN: "Администратор", MANAGER: "Менеджер", AGENT: "Специалист", READONLY: "Наблюдатель" };
