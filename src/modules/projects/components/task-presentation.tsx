
import { useI18n } from "@/i18n/use-i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials, dateLabel } from "@/lib/utils";
import type { Task, TaskAssignee, TaskPriority, TaskStatus } from "../task-types";

export const TASK_STATUS_LABELS: Record<TaskStatus | "CANCELLED", string> = { TODO: "К выполнению", IN_PROGRESS: "В работе", IN_REVIEW: "На проверке", DONE: "Завершена", CANCELLED: "Отменена (история)" };
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = { LOW: "Низкий", MEDIUM: "Средний", HIGH: "Высокий", URGENT: "Срочный" };
const priorityTones = { LOW: "info", MEDIUM: "primary", HIGH: "warning", URGENT: "danger" } as const;
/** Show a task priority with both text and a design-system tone. */
export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const { t } = useI18n();
 const tone = priorityTones[priority]; return <Badge variant="outline" style={{ color: `hsl(var(--color-${tone}))`, backgroundColor: `hsl(var(--color-${tone}-soft))` }}>{t(TASK_PRIORITY_LABELS[priority])}</Badge>; }
/** Render a shared avatar for the assigned workspace member, or explicit unassigned text. */
export function TaskAssigneeAvatar({ assignee }: { assignee: TaskAssignee | null }) {
  const { t } = useI18n();
 return assignee ? <Avatar className="size-7 shrink-0 border" title={t`Исполнитель: ${assignee.name}`} aria-label={t`Исполнитель: ${assignee.name}`}><AvatarImage src={assignee.avatar ?? undefined} alt="" /><AvatarFallback className="bg-primary/10 text-[10px] text-primary">{initials(assignee.name)}</AvatarFallback></Avatar> : <span className="text-[11px] text-muted-foreground">{t("Не назначен")}</span>; }
/** Present the due date in Moscow and mark overdue tasks without marking completed tasks late. */
export function TaskDueDate({ task, now }: { task: Task; now: string }) {
  const { t , locale: uiLocale } = useI18n();
 const overdue = Boolean(task.dueAt && task.dueAt < now && task.status !== "DONE" && task.status !== "CANCELLED"); return task.dueAt ? <time dateTime={task.dueAt} title={task.dueDate} className={`text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>{dateLabel(task.dueAt, uiLocale)}{overdue ? t(" · просрочено") : ""}</time> : <span className="text-xs text-muted-foreground">{t("Без срока")}</span>; }
