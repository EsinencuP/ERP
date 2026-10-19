import { Dashboard } from "@/components/blocks/dashboard";
import { ErrorPanel } from "@/components/ui/feedback";
import { getSession } from "@/lib/auth";
import { getWorkspaceState } from "@/lib/repository";
import { getFinanceDashboard } from "@/modules/finance/analytics";

/** Load operational summaries and normalized finance concurrently after tenant authentication. */
export default async function Page() {
  const session = await getSession(); if (!session.ok) return <ErrorPanel error={session.error} />;
  const [state, finance] = await Promise.all([getWorkspaceState(session.data), getFinanceDashboard()]);
  if (!state.ok) return <ErrorPanel error={state.error} />;
  return <Dashboard state={state.data} session={session.data} finance={finance} />;
}
