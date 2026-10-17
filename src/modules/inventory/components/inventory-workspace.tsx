import { ModuleWorkspace } from "@/components/blocks/module-workspace";
import type { SessionContext, WorkspaceState } from "@/types/shared";

/** Render the inventory module using shared table, form and board primitives. */
export function ProductWorkspace({ state, session }: { state: WorkspaceState; session: SessionContext }) { return <ModuleWorkspace domain="inventory" initialState={state} session={session} />; }
