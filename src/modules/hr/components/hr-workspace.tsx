import { ModuleWorkspace } from "@/components/blocks/module-workspace";
import type { SessionContext, WorkspaceState } from "@/types/shared";

/** Render preserved legacy HR documents through the shared workspace primitives. */
export function EmployeeWorkspace({ state, session }: { state: WorkspaceState; session: SessionContext }) { return <ModuleWorkspace domain="hr" initialState={state} session={session} />; }
