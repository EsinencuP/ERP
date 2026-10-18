import { Dashboard } from "@/components/blocks/dashboard";
import { ErrorPanel } from "@/components/ui/feedback";
import { getSession } from "@/lib/auth";
import { getWorkspaceState } from "@/lib/repository";

/** Load the current workspace overview using persisted documents and receipts. */
export default async function Page() { const session = await getSession(); if (!session.ok) return <ErrorPanel error={session.error} />; const state = await getWorkspaceState(session.data); if (!state.ok) return <ErrorPanel error={state.error} />; return <Dashboard state={state.data} session={session.data} />; }
