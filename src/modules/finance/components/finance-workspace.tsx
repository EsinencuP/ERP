import { ModuleWorkspace } from "@/components/blocks/module-workspace";
import type { SessionContext, WorkspaceState } from "@/types/shared";

/** Render the finance module using shared table, form and board primitives. */
export function InvoiceWorkspace({ state, session }: { state: WorkspaceState; session: SessionContext }) { return <ModuleWorkspace domain="finance" initialState={state} session={session} />; }
