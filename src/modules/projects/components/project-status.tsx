import { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "../overview-types";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = { PLANNING: "Планирование", ACTIVE: "В работе", ON_HOLD: "Приостановлен", COMPLETED: "Завершён", CANCELLED: "Отменён" };
/** Present project status using shared badges and existing semantic color tokens. */
export function ProjectStatusBadge({ status }: { status: ProjectStatus }) { return <Badge status={PROJECT_STATUS_LABELS[status]} />; }
