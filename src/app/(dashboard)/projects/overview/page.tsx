import { getProjectOverview } from "@/modules/projects/overview-queries";
import { ProjectOverview } from "@/modules/projects/components/project-overview";
import { ProjectNavigation } from "@/modules/projects/components/project-navigation";

/** Load a tenant-scoped project overview, optionally focused by a project deep link. */
export default async function Page({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId } = await searchParams, filters = projectId === undefined ? {} : { projectId };
  return <><ProjectNavigation section="overview" /><ProjectOverview key={projectId ?? "all"} initialFilters={filters} initialData={await getProjectOverview(filters)} /></>;
}
