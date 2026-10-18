import { AppShell } from "@/components/layout/app-shell";
import { cookies } from "next/headers";
import { AuthSessionProvider } from "@/components/layout/auth-session-provider";
import { ErrorPanel } from "@/components/ui/feedback";
import { getSession } from "@/lib/auth";
import { getWorkspaceState } from "@/lib/repository";

export const dynamic = "force-dynamic";

/** Protect every dashboard route and hydrate the tenant's navigation shell. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.ok) return <main id="main-content" className="grid min-h-dvh place-items-center p-6"><ErrorPanel error={session.error} /></main>;
  const state = await getWorkspaceState(session.data);
  if (!state.ok) return <main id="main-content" className="grid min-h-dvh place-items-center p-6"><ErrorPanel error={state.error} /></main>;
  const defaultSidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  return <AuthSessionProvider session={session.data}><AppShell session={session.data} state={state.data} defaultSidebarOpen={defaultSidebarOpen}>{children}</AppShell></AuthSessionProvider>;
}
