import { CrmNavigation } from "@/modules/crm/components/crm-navigation";
import { DealKanban } from "@/modules/crm/components/deal-kanban";
import { getDealsByStage } from "@/modules/crm/queries";
import { PIPELINE_QUERY } from "@/modules/crm/pipeline";

/** Hydrate the pipeline with a bounded, authenticated six-column server snapshot. */
export default async function Page() {
  const initialData = await getDealsByStage(PIPELINE_QUERY);
  return <section className="motion-fade"><CrmNavigation active="pipeline" /><DealKanban initialData={initialData} initialNow={new Date().toISOString()} /></section>;
}
