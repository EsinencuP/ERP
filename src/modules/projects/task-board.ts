import { TASK_STATUSES } from "./task-schema";
import type { Task, TaskBoard, TaskStatus } from "./task-types";

/** Validate a status originating from a select, keyboard event or DnD payload. */
export function getTaskStatus(value: unknown): TaskStatus | null { return typeof value === "string" && TASK_STATUSES.some((status) => status === value) ? value as TaskStatus : null; }
/** Namespace column drop zones separately from persisted task IDs. */
export function taskColumnId(status: TaskStatus): string { return `task-column:${status}`; }
/** Recognize only the four explicit task column targets. */
export function taskColumnStatus(value: unknown): TaskStatus | null { return typeof value === "string" && value.startsWith("task-column:") ? getTaskStatus(value.slice("task-column:".length)) : null; }
/** Optimistically move a loaded task while keeping exact column totals and leaving the snapshot untouched. */
export function moveBoardTask(board: TaskBoard, task: Task, status: TaskStatus): TaskBoard {
  if (task.status === "CANCELLED" || task.status === status) return board;
  const source = board[task.status], target = board[status], total = Math.max(0, source.total - 1);
  return { ...board, [task.status]: { ...source, data: source.data.filter((row) => row.id !== task.id), total, totalPages: Math.ceil(total / source.pageSize) }, [status]: { ...target, data: [{ ...task, status }, ...target.data.filter((row) => row.id !== task.id)], total: target.total + 1, totalPages: Math.ceil((target.total + 1) / target.pageSize) } };
}

/** Reconcile the confirmed task version in all currently loaded columns without changing their totals. */
export function updateBoardTask(board: TaskBoard, task: Task): TaskBoard {
  const next = { ...board };
  for (const status of TASK_STATUSES) next[status] = { ...board[status], data: board[status].data.map((row) => row.id === task.id ? task : row) };
  return next;
}
