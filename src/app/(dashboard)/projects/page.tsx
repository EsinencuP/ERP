import { getTaskProject } from "@/modules/projects/task-queries";
import { getTaskWorkspace } from "@/modules/projects/task-queries";
import { TaskWorkspace } from "@/modules/projects/components/task-workspace";
import { ProjectNavigation } from "@/modules/projects/components/project-navigation";

/** Load normalized task columns and list for the authenticated workspace. */
export default async function Page({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) { const { projectId } = await searchParams, project = projectId === undefined ? null : await getTaskProject(projectId); return <><ProjectNavigation /><TaskWorkspace key={projectId ?? "all"} initialProject={project?.ok ? project.data : null} initialData={project && !project.ok ? project : await getTaskWorkspace(projectId === undefined ? {} : { projectId })} initialNow={new Date().toISOString()} /></>; }
