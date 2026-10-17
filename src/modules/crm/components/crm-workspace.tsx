import { ModuleWorkspace } from "@/components/blocks/module-workspace";
import type { SessionContext, WorkspaceState } from "@/types/shared";

/** Render the crm module using shared table, form and board primitives. */
export function DealWorkspace({ state, session }: { state: WorkspaceState; session: SessionContext }) { return <ModuleWorkspace domain="crm" initialState={state} session={session} />; }
