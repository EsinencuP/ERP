import { ModuleWorkspace } from "@/components/blocks/module-workspace";
import type { SessionContext, WorkspaceState } from "@/types/shared";

/** Render the projects module using shared table, form and board primitives. */
export function ProjectWorkspace({ state, session }: { state: WorkspaceState; session: SessionContext }) { return <ModuleWorkspace domain="projects" initialState={state} session={session} />; }
