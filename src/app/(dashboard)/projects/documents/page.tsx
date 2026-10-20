import { ModulePage } from "@/components/blocks/module-page";
import { ProjectNavigation } from "@/modules/projects/components/project-navigation";

/** Preserve the original document-based Projects registry and its existing actions. */
export default function Page() { return <><ProjectNavigation legacy /><ModulePage domain="projects" /></>; }
