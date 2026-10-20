import "server-only";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import { sqlTextMatch } from "@/lib/sql-search";
import type { PaginatedResponse, Result } from "@/types/shared";
import { getTaskContext, getTaskError } from "./task-access";
import { taskFiltersSchema, taskOptionFiltersSchema, taskIdSchema } from "./task-schema";
import { taskInclude, toTask } from "./task-serializers";
import type { Task, TaskAssignee, TaskFilters, TaskProject, TaskStatus, TaskWorkspaceData } from "./task-types";

type Filters = z.output<typeof taskFiltersSchema>;
/** Resolve one real project for a deep link or a captured picker selection within the live workspace. */
export async function getTaskProject(id: string): Promise<Result<TaskProject>> {
  const context = await getTaskContext(); if (!context.ok) return context;
  if (!taskIdSchema.safeParse(id).success) return err("VALIDATION", "Укажите проект");
  try { const project = await db.project.findUnique({ where: { id_workspaceId: { id, workspaceId: context.data.workspaceId } }, select: { id: true, code: true, name: true } }); return project ? ok(project) : err("NOT_FOUND", "Проект не найден"); }
  catch (error: unknown) { return getTaskError(error); }
}
async function readPage(tx: Prisma.TransactionClient, workspaceId: string, filters: Filters, status?: TaskStatus): Promise<PaginatedResponse<Task>> {
  const pageSize = 20, requestedPage = status ? filters.columnPages[status] : filters.page;
  const selectedStatus = status ?? filters.status;
  const where = Prisma.sql`t."workspaceId" = ${workspaceId}
    ${filters.projectId ? Prisma.sql`AND t."projectId" = ${filters.projectId}` : Prisma.empty}
    ${selectedStatus ? Prisma.sql`AND t.status = ${selectedStatus}::"TaskStatus"` : Prisma.empty}
    ${filters.priority ? Prisma.sql`AND t.priority = ${filters.priority}::"Priority"` : Prisma.empty}
    ${filters.assignedToId === undefined ? Prisma.empty : filters.assignedToId === null ? Prisma.sql`AND t."assignedToId" IS NULL` : Prisma.sql`AND t."assignedToId" = ${filters.assignedToId}`}
    ${filters.search ? Prisma.sql`AND ${sqlTextMatch(Prisma.sql`concat_ws(' ', t.title, t.description, p.name, p.code, u.name)`, filters.search)}` : Prisma.empty}`;
  const joins = Prisma.sql`FROM "Task" t JOIN "Project" p ON p.id = t."projectId" AND p."workspaceId" = t."workspaceId" LEFT JOIN "User" u ON u.id = t."assignedToId"`;
  const field = status ? "updatedAt" : filters.sort.field, direction = status ? "desc" : filters.sort.direction;
  const counts = await tx.$queryRaw<{ count: bigint }[]>`SELECT count(*) AS count ${joins} WHERE ${where}`;
  const total = Number(counts[0]?.count ?? 0n), totalPages = Math.ceil(total / pageSize), page = Math.min(requestedPage, Math.max(1, totalPages));
  const ids = await tx.$queryRaw<{ id: string }[]>`SELECT t.id ${joins} WHERE ${where} ORDER BY ${Prisma.raw(`t."${field}"`)} ${Prisma.raw(direction)} NULLS LAST, t.id ASC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
  const rows = await tx.task.findMany({ where: { workspaceId, id: { in: ids.map((row) => row.id) } }, include: taskInclude });
  const byId = new Map(rows.map((row) => [row.id, toTask(row)]));
  return { data: ids.flatMap(({ id }) => { const row = byId.get(id); return row ? [row] : []; }), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Read four bounded Kanban columns and a server-sorted list from one authorized PostgreSQL snapshot. */
export async function getTaskWorkspace(filters: TaskFilters = {}): Promise<Result<TaskWorkspaceData>> {
  const context = await getTaskContext(); if (!context.ok) return context;
  const parsed = taskFiltersSchema.safeParse(filters); if (!parsed.success) return err("VALIDATION", "Проверьте фильтры задач");
  try {
    return await db.$transaction(async (tx) => {
      const workspaceId = context.data.workspaceId;
      if (parsed.data.projectId && !await tx.project.findUnique({ where: { id_workspaceId: { id: parsed.data.projectId, workspaceId } }, select: { id: true } })) return err("NOT_FOUND", "Проект не найден");
      const [TODO, IN_PROGRESS, IN_REVIEW, DONE, list] = await Promise.all([readPage(tx, workspaceId, parsed.data, "TODO"), readPage(tx, workspaceId, parsed.data, "IN_PROGRESS"), readPage(tx, workspaceId, parsed.data, "IN_REVIEW"), readPage(tx, workspaceId, parsed.data, "DONE"), readPage(tx, workspaceId, parsed.data)]);
      return ok({ board: { TODO, IN_PROGRESS, IN_REVIEW, DONE }, list });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15000 });
  } catch (error: unknown) { return getTaskError(error); }
}

/** Search a bounded page of real projects for task creation and workspace filtering. */
export async function getTaskProjects(filters: { search?: string; page?: number } = {}): Promise<Result<PaginatedResponse<TaskProject>>> {
  const context = await getTaskContext(); if (!context.ok) return context;
  const parsed = taskOptionFiltersSchema.safeParse(filters); if (!parsed.success) return err("VALIDATION", "Проверьте поиск проектов");
  const { search, page } = parsed.data, workspaceId = context.data.workspaceId, match = search ? Prisma.sql`AND ${sqlTextMatch(Prisma.sql`concat_ws(' ', code, name)`, search)}` : Prisma.empty;
  try {
    const [data, rows] = await Promise.all([db.$queryRaw<TaskProject[]>`SELECT id, code, name FROM "Project" WHERE "workspaceId" = ${workspaceId} ${match} ORDER BY name, id LIMIT 20 OFFSET ${(page - 1) * 20}`, db.$queryRaw<{ count: bigint }[]>`SELECT count(*) AS count FROM "Project" WHERE "workspaceId" = ${workspaceId} ${match}`]);
    const total = Number(rows[0]?.count ?? 0n); return ok({ data, total, page, pageSize: 20, totalPages: Math.ceil(total / 20) });
  } catch (error: unknown) { return getTaskError(error); }
}

/** Search active workspace members; task assignees are login members, not unrelated employee profiles. */
export async function getTaskAssignees(filters: { search?: string; page?: number } = {}): Promise<Result<PaginatedResponse<TaskAssignee>>> {
  const context = await getTaskContext(); if (!context.ok) return context;
  const parsed = taskOptionFiltersSchema.safeParse(filters); if (!parsed.success) return err("VALIDATION", "Проверьте поиск исполнителя");
  const { search, page } = parsed.data, workspaceId = context.data.workspaceId, match = search ? Prisma.sql`AND ${sqlTextMatch(Prisma.sql`u.name`, search)}` : Prisma.empty;
  try {
    const from = Prisma.sql`FROM "Membership" m JOIN "User" u ON u.id = m."userId" WHERE m."workspaceId" = ${workspaceId} AND m."isActive" AND u."isActive" ${match}`;
    const [data, rows] = await Promise.all([db.$queryRaw<TaskAssignee[]>`SELECT u.id, u.name, u.avatar ${from} ORDER BY u.name, u.id LIMIT 20 OFFSET ${(page - 1) * 20}`, db.$queryRaw<{ count: bigint }[]>`SELECT count(*) AS count ${from}`]);
    const total = Number(rows[0]?.count ?? 0n); return ok({ data, total, page, pageSize: 20, totalPages: Math.ceil(total / 20) });
  } catch (error: unknown) { return getTaskError(error); }
}
