import "server-only";
import { Prisma } from "@prisma/client";
import type { Task } from "./task-types";

export const taskInclude = { project: { select: { id: true, code: true, name: true } }, assignedTo: { select: { user: { select: { id: true, name: true, avatar: true } } } } } satisfies Prisma.TaskInclude;
/** Serialize bounded task data without workspace, credentials or arbitrary decimal conversion. */
export function toTask(row: Prisma.TaskGetPayload<{ include: typeof taskInclude }>): Task {
  return { id: row.id, projectId: row.projectId, project: row.project, parentId: row.parentId, title: row.title, description: row.description, status: row.status, priority: row.priority, assignedToId: row.assignedToId, assignedTo: row.assignedTo?.user ?? null, dueAt: row.dueAt?.toISOString() ?? null, dueDate: row.dueAt ? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(row.dueAt) : "", completedAt: row.completedAt?.toISOString() ?? null, version: row.version, updatedAt: row.updatedAt.toISOString() };
}
