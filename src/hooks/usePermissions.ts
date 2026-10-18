"use client";

import { useSession } from "next-auth/react";
import { hasPermission, isRole } from "@/lib/permissions";
import type { Permission } from "@/types/shared";

/** UI affordances from the live Auth.js session; server checks remain authoritative. */
export function usePermissions() {
  const { data: session, status } = useSession();
  const role = status === "authenticated" && !session?.authError && isRole(session?.user.role) ? session.user.role : null;
  function can(permission: Permission): boolean { return hasPermission(role, permission); }
  return { role, can, isAdmin: role === "SUPER_ADMIN" || role === "ADMIN", isLoading: status === "loading" };
}
