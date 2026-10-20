import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import type { Result, SessionContext } from "@/types/shared";
import { getTaskContext, getTaskError } from "./task-access";
import { taskIdSchema, taskVersionSchema, taskSchema, taskProjectSchema, TASK_STATUSES } from "./task-schema";
import { taskInclude, toTask } from "./task-serializers";
import type { Task, TaskInput, TaskProject, TaskProjectInput, TaskStatus } from "./task-types";

/** Commit Projects operations and audit serializably, retrying only guaranteed P2034 rollback. */
export async function withProjectsMutation<T>(operation: "create" | "update" | "delete", handleMutation: (tx: Prisma.TransactionClient, session: SessionContext) => Promise<Result<T>>): Promise<Result<T>> {
  const context = await getTaskContext(operation); if (!context.ok) return context;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await db.$transaction((tx) => handleMutation(tx, context.data), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 }); }
    catch (error: unknown) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue; return getTaskError(error); }
  }
  return err("CONFLICT", "Обновите задачи перед повтором");
}
async function audit(tx: Prisma.TransactionClient, session: SessionContext, action: "created" | "updated" | "deleted", task: Task, before: Task | null) { await tx.auditLog.create({ data: { workspaceId: session.workspaceId, actorId: session.userId, actor: session.name, domain: "projects", entityType: "Task", entityId: task.id, action, title: task.title, before: before ? { ...before } : Prisma.DbNull, after: action === "deleted" ? Prisma.DbNull : { ...task } } }); }
async function current(tx: Prisma.TransactionClient, workspaceId: string, id: string, version: number) {
  if (!taskIdSchema.safeParse(id).success || !taskVersionSchema.safeParse(version).success) return err("VALIDATION", "Нужны ID и актуальная версия задачи");
  const task = await tx.task.findUnique({ where: { id_workspaceId: { id, workspaceId } }, include: taskInclude });
  if (!task) return err("NOT_FOUND", "Задача не найдена");
  return task.version === version ? ok(task) : err("CONFLICT", "Задача уже изменена. Обновите данные");
}
async function assignee(tx: Prisma.TransactionClient, workspaceId: string, id: string) { return !id || Boolean(await tx.membership.findFirst({ where: { workspaceId, userId: id, isActive: true, user: { isActive: true } }, select: { userId: true } })); }
function dueAt(date: string) { return date ? new Date(`${date}T23:59:59.999+03:00`) : null; }

/** Create a real project with the minimum fields required to organize tasks, preserving existing project defaults. */
export async function createTaskProject(input: TaskProjectInput): Promise<Result<TaskProject>> {
  return withProjectsMutation("create", async (tx, session) => {
    const parsed = taskProjectSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Проверьте код и название проекта");
    const row = await tx.project.create({ data: { ...parsed.data, workspaceId: session.workspaceId } }), project = { id: row.id, code: row.code, name: row.name };
    await tx.auditLog.create({ data: { workspaceId: session.workspaceId, actorId: session.userId, actor: session.name, domain: "projects", entityType: "Project", entityId: row.id, action: "created", title: row.name, before: Prisma.DbNull, after: { ...project, version: row.version } } }); return ok(project);
  });
}
/** Create a versioned task for an existing workspace project and an optional active member. */
export async function createTask(input: TaskInput): Promise<Result<Task>> {
  return withProjectsMutation("create", async (tx, session) => {
    const parsed = taskSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Проверьте поля задачи"); const data = parsed.data;
    if (!await tx.project.findUnique({ where: { id_workspaceId: { id: data.projectId, workspaceId: session.workspaceId } }, select: { id: true } })) return err("NOT_FOUND", "Проект не найден");
    if (!await assignee(tx, session.workspaceId, data.assignedToId)) return err("VALIDATION", "Исполнитель должен быть активным участником пространства");
    const { dueDate, ...fields } = data, row = await tx.task.create({ data: { ...fields, workspaceId: session.workspaceId, assignedToId: data.assignedToId || null, description: data.description || null, dueAt: dueAt(dueDate), completedAt: data.status === "DONE" ? new Date() : null }, include: taskInclude }), task = toTask(row);
    await audit(tx, session, "created", task, null); return ok(task);
  });
}
/** Edit task fields without moving it between projects or changing its existing parent relationship. */
export async function updateTask(id: string, version: number, input: TaskInput): Promise<Result<Task>> {
  return withProjectsMutation("update", async (tx, session) => {
    const before = await current(tx, session.workspaceId, id, version); if (!before.ok) return before;
    const parsed = taskSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Проверьте поля задачи"); const data = parsed.data;
    if (before.data.status === "CANCELLED") return err("CONFLICT", "Отменённая задача доступна только для чтения");
    if (data.projectId !== before.data.projectId) return err("VALIDATION", "Проект существующей задачи менять нельзя");
    if (data.assignedToId !== (before.data.assignedToId ?? "") && !await assignee(tx, session.workspaceId, data.assignedToId)) return err("VALIDATION", "Исполнитель должен быть активным участником пространства");
    const { dueDate, ...fields } = data, previous = toTask(before.data);
    const row = await tx.task.update({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version }, data: { ...fields, description: data.description || null, assignedToId: data.assignedToId || null, dueAt: previous.dueDate === dueDate ? before.data.dueAt : dueAt(dueDate), completedAt: data.status === "DONE" ? before.data.completedAt ?? new Date() : null, version: { increment: 1 } }, include: taskInclude }), task = toTask(row);
    await audit(tx, session, "updated", task, previous); return ok(task);
  });
}
/** Move one current-version task between the four board statuses, recording completion or reopening atomically. */
export async function updateTaskStatus(id: string, version: number, status: TaskStatus): Promise<Result<Task>> {
  return withProjectsMutation("update", async (tx, session) => {
    if (!TASK_STATUSES.some((value) => value === status)) return err("VALIDATION", "Неверный статус задачи");
    const before = await current(tx, session.workspaceId, id, version); if (!before.ok) return before;
    if (before.data.status === "CANCELLED") return err("CONFLICT", "Отменённая задача доступна только для чтения");
    if (before.data.status === status) return ok(toTask(before.data));
    const row = await tx.task.update({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version }, data: { status, completedAt: status === "DONE" ? new Date() : null, version: { increment: 1 } }, include: taskInclude }), task = toTask(row);
    await audit(tx, session, "updated", task, toTask(before.data)); return ok(task);
  });
}
/** Delete only a current-version leaf task with shared Projects deletion permission. */
export async function deleteTask(id: string, version: number): Promise<Result<Task>> {
  return withProjectsMutation("delete", async (tx, session) => {
    const before = await current(tx, session.workspaceId, id, version); if (!before.ok) return before;
    if (before.data.status === "CANCELLED") return err("CONFLICT", "Отменённая задача доступна только для чтения");
    if (await tx.task.count({ where: { workspaceId: session.workspaceId, parentId: id } })) return err("CONFLICT", "Сначала удалите подзадачи");
    await tx.task.delete({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version } }); const task = toTask(before.data); await audit(tx, session, "deleted", task, task); return ok(task);
  });
}
