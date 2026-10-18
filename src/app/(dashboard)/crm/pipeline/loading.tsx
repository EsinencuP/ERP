import { DealKanbanSkeleton } from "@/modules/crm/components/deal-kanban-skeleton";

/** Show the pipeline skeleton while its Server Component reads PostgreSQL. */
export default function Loading() { return <DealKanbanSkeleton />; }
