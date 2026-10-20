"use client";
import { useI18n } from "@/i18n/use-i18n";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DndContext, DragOverlay, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronLeft, ChevronRight, GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createKanbanDnd, useKanbanSensors } from "@/hooks/use-kanban-dnd";
import type { PaginatedResponse } from "@/types/shared";
import { TASK_STATUSES } from "../task-schema";
import { getTaskStatus, taskColumnId, taskColumnStatus } from "../task-board";
import type { Task, TaskBoard, TaskStatus } from "../task-types";
import { TaskAssigneeAvatar, TaskDueDate, TaskPriorityBadge, TASK_STATUS_LABELS } from "./task-presentation";

const dnd = createKanbanDnd({ statuses: TASK_STATUSES, columnId: taskColumnId, columnStatus: taskColumnStatus, status: getTaskStatus, activeKey: "status", boardSelector: "[data-task-board]" });
type Controls = { disabled: boolean; mayWrite: boolean; mayDelete: boolean; now: string; onMove: (task: Task, status: TaskStatus) => void; onEdit: (task: Task) => void; onDelete: (task: Task) => void };

function CardContent({ task, now }: { task: Task; now: string }) { return <><p className="mb-3 truncate font-mono text-[10px] text-muted-foreground" title={task.project.name}><Link href={`/projects/overview?projectId=${encodeURIComponent(task.projectId)}`} className="hover:text-primary hover:underline">{task.project.code} · {task.project.name}</Link></p><h3 className="break-words text-sm font-medium leading-relaxed">{task.title}</h3>{task.description && <p className="mt-2 line-clamp-2 break-words text-xs text-muted-foreground" title={task.description}>{task.description}</p>}<div className="mt-4 flex flex-wrap items-center justify-between gap-2"><TaskPriorityBadge priority={task.priority} /><TaskAssigneeAvatar assignee={task.assignedTo} /></div><div className="mt-3"><TaskDueDate task={task} now={now} /></div></>; }
function TaskCard({ task, ...controls }: Controls & { task: Task }) {
  const { t } = useI18n();

  const disabled = controls.disabled || !controls.mayWrite;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled, data: { status: task.status, type: "task" } });
  return <article ref={setNodeRef} data-task-id={task.id} data-status={task.status} aria-label={t`Задача: ${task.title}`} className={cn("motion-fade relative rounded-xl border bg-surface p-4 shadow-sm", isDragging && "opacity-25")} style={{ transform: CSS.Transform.toString(transform), transition }}><div className="mb-2 flex items-center justify-end gap-1">{controls.mayWrite && <><Button size="icon" variant="ghost" className="size-7" disabled={controls.disabled} aria-label={t`Редактировать задачу: ${task.title}`} onClick={function handleEdit() { controls.onEdit(task); }}><Pencil /></Button><button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} disabled={disabled} aria-label={t`Переместить задачу: ${task.title}`} className="touch-none rounded-md p-1 text-muted-foreground hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"><GripVertical className="size-4" /></button></>}{controls.mayDelete && <Button size="icon" variant="ghost" className="size-7" disabled={controls.disabled} aria-label={t`Удалить задачу: ${task.title}`} onClick={function handleDelete() { controls.onDelete(task); }}><Trash2 /></Button>}</div><CardContent task={task} now={controls.now} /><label className="sr-only" htmlFor={`task-status-${task.id}`}>{t("Статус: ")}{task.title}</label><select id={`task-status-${task.id}`} className="input mt-4 h-8 px-2 text-[11px]" value={task.status} disabled={disabled} onChange={function handleStatus(event) { const value = getTaskStatus(event.target.value); if (value) controls.onMove(task, value); }}>{TASK_STATUSES.map((status) => <option key={status} value={status}>{t(status)}</option>)}</select></article>;
}
function TaskColumn({ status, column, onPage, ...controls }: Controls & { status: TaskStatus; column: PaginatedResponse<Task>; onPage: (status: TaskStatus, page: number) => void }) {
  const { t } = useI18n();

  const { setNodeRef, isOver } = useDroppable({ id: taskColumnId(status), disabled: controls.disabled || !controls.mayWrite });
  return <section ref={setNodeRef} data-task-column={status} aria-label={t`Статус: ${status}`} className={cn("motion-fade flex h-[min(42rem,calc(100dvh-20rem))] min-h-96 w-64 shrink-0 flex-col rounded-xl border bg-muted/20 transition-colors", isOver && "border-primary bg-primary/5")}><header className="flex items-center justify-between gap-2 border-b p-4"><div><h2 className="font-mono text-xs font-semibold">{t(status)}</h2><p className="mt-1 text-[10px] text-muted-foreground">{t(TASK_STATUS_LABELS[status])}</p></div><span className="rounded-md border bg-surface px-2 py-1 font-mono text-xs" aria-label={t`Задач: ${column.total}`}>{column.total}</span></header><SortableContext id={taskColumnId(status)} items={column.data.map((task) => task.id)} strategy={verticalListSortingStrategy}><div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3" role="list" aria-label={t`Задачи: ${status}`}>{column.data.map((task) => <div key={task.id} role="listitem"><TaskCard {...controls} task={task} /></div>)}{!column.data.length && <p className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">{column.total ? t("На этой странице задач нет") : controls.mayWrite ? t("Перетащите сюда задачу") : t("Задач пока нет")}</p>}</div></SortableContext><footer className="flex items-center justify-between gap-1 border-t p-2 text-[10px] text-muted-foreground"><span>{column.data.length} {t(" из ")}{column.total}</span><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="size-7" disabled={controls.disabled || column.page <= 1} aria-label={t`Предыдущая страница: ${status}`} onClick={function handlePrevious() { onPage(status, column.page - 1); }}><ChevronLeft /></Button><span>{column.page} / {Math.max(1, column.totalPages)}</span><Button variant="ghost" size="icon" className="size-7" disabled={controls.disabled || column.page >= column.totalPages} aria-label={t`Следующая страница: ${status}`} onClick={function handleNext() { onPage(status, column.page + 1); }}><ChevronRight /></Button></div></footer></section>;
}

/** Render task columns using the same pointer, empty-column and keyboard DnD behavior as CRM. */
export function TaskKanban({ board, onPage, onDraggingChange, ...controls }: Controls & { board: TaskBoard; onPage: (status: TaskStatus, page: number) => void; onDraggingChange: (dragging: boolean) => void }) {
  const { t } = useI18n();

  const sensors = useKanbanSensors(dnd.keyboardCoordinates), [activeId, setActiveId] = useState<string | null>(null), [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const active = TASK_STATUSES.flatMap((status) => board[status].data).find((task) => task.id === activeId);
  return <DndContext id="projects-task-board" sensors={sensors} collisionDetection={dnd.collisionDetection} onDragStart={function handleStart(event) { setActiveId(String(event.active.id)); onDraggingChange(true); }} onDragCancel={function handleCancel() { setActiveId(null); onDraggingChange(false); }} onDragEnd={function handleEnd(event) { setActiveId(null); onDraggingChange(false); const status = taskColumnStatus(event.over?.id); if (active && status) controls.onMove(active, status); }} accessibility={{ screenReaderInstructions: { draggable: t("Пробел — выбрать задачу. Стрелки влево и вправо — выбрать статус. Пробел — сохранить, Escape — отменить. Статус также доступен в списке карточки.") }, announcements: { onDragStart: () => t("Задача выбрана. Стрелки влево и вправо выбирают статус"), onDragOver: ({ over }) => taskColumnStatus(over?.id) ?? t("Вне колонок"), onDragEnd: ({ over }) => taskColumnStatus(over?.id) ? t`Выбран статус ${taskColumnStatus(over?.id)}` : t("Перемещение отменено"), onDragCancel: () => t("Перемещение отменено") } }}><div data-task-board className="min-w-0 overflow-x-auto rounded-xl pb-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" role="region" aria-label={t("Kanban задач")} tabIndex={0}><div className="flex w-max items-start gap-4">{TASK_STATUSES.map((status) => <TaskColumn key={status} {...controls} status={status} column={board[status]} onPage={function handlePage(value, page) { if (!activeId) onPage(value, page); }} />)}</div></div>{mounted && createPortal(<DragOverlay dropAnimation={null}>{active && <div aria-hidden="true" className="w-64 rounded-xl border border-primary bg-surface p-4 shadow-xl"><CardContent task={active} now={controls.now} /></div>}</DragOverlay>, document.body)}</DndContext>;
}
