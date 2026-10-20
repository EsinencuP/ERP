import { getAppConfiguration } from "@/modules/settings/config-queries";
import { ConfigurationProvider } from "@/modules/settings/configuration-provider";
import { AppShell } from "@/components/layout/app-shell";
import { cookies } from "next/headers";
import { AuthSessionProvider } from "@/components/layout/auth-session-provider";
import { ErrorPanel } from "@/components/ui/feedback";
import { getSession } from "@/lib/auth";
import { getWorkspaceState } from "@/lib/repository";
import { getInventoryStockAlert } from "@/modules/inventory/queries";

import { getLeavePendingCount } from "@/modules/hr/leave-queries";
import { canApproveLeave } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** Protect every dashboard route and hydrate the tenant's navigation shell. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.ok) return <main id="main-content" className="grid min-h-dvh place-items-center p-6"><ErrorPanel error={session.error} /></main>;
  const [state, inventoryAlert, leavePending, configuration] = await Promise.all([getWorkspaceState(session.data), session.data.demo ? Promise.resolve(null) : getInventoryStockAlert(), !session.data.demo && canApproveLeave(session.data.role) ? getLeavePendingCount() : Promise.resolve(null), getAppConfiguration()]);
  if (!state.ok) return <main id="main-content" className="grid min-h-dvh place-items-center p-6"><ErrorPanel error={state.error} /></main>;
  if (!configuration.ok) return <main id="main-content" className="grid min-h-dvh place-items-center p-6"><ErrorPanel error={configuration.error} /></main>;
  const defaultSidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  return <AuthSessionProvider session={session.data}><ConfigurationProvider initial={configuration.data}><AppShell session={session.data} state={state.data} inventoryAlert={inventoryAlert} leavePending={leavePending} defaultSidebarOpen={defaultSidebarOpen}>{children}</AppShell></ConfigurationProvider></AuthSessionProvider>;
}
