import { ModuleWorkspace } from "@/components/blocks/module-workspace";
import type { SessionContext, WorkspaceState } from "@/types/shared";

/** Render the hr module using shared table, form and board primitives. */
export function EmployeeWorkspace({ state, session }: { state: WorkspaceState; session: SessionContext }) { return <ModuleWorkspace domain="hr" initialState={state} session={session} />; }
