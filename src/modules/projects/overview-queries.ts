import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import { sqlTextMatch } from "@/lib/sql-search";
import type { PaginatedResponse, Result } from "@/types/shared";
import { getTaskContext, getTaskError } from "./task-access";
import { taskIdSchema } from "./task-schema";
import { overviewFiltersSchema, projectTeamFiltersSchema } from "./overview-schema";
import type { OverviewFilters, OverviewProject, ProjectOverviewData, ProjectTeamMember } from "./overview-types";

type TeamRow = ProjectTeamMember & { projectId: string; total: bigint };
function teamCte(workspaceId: string, ids: string[]) {
  return Prisma.sql`WITH candidates AS (
    SELECT p.id AS "projectId", p."managerId" AS "userId", true AS "isManager" FROM "Project" p
      WHERE p."workspaceId" = ${workspaceId} AND p.id IN (${Prisma.join(ids)}) AND p."managerId" IS NOT NULL
    UNION ALL SELECT t."projectId", t."assignedToId", false FROM "Task" t
      WHERE t."workspaceId" = ${workspaceId} AND t."projectId" IN (${Prisma.join(ids)}) AND t."assignedToId" IS NOT NULL
  ), members AS (SELECT "projectId", "userId", bool_or("isManager") AS "isManager" FROM candidates GROUP BY "projectId", "userId"),
  team AS (SELECT c."projectId", u.id, u.name, u.avatar, c."isManager", (m."isActive" AND u."isActive") AS active
    FROM members c JOIN "Membership" m ON m."userId" = c."userId" AND m."workspaceId" = ${workspaceId} JOIN "User" u ON u.id = m."userId")`;
}
function member(row: TeamRow): ProjectTeamMember { return { id: row.id, name: row.name, avatar: row.avatar, isManager: row.isManager, active: row.active }; }

/** Read a stable page of projects with full task counts, exact attributed costs and bounded distinct team previews. */
export async function getProjectOverview(filters: OverviewFilters = {}): Promise<Result<ProjectOverviewData>> {
  const context = await getTaskContext(); if (!context.ok) return context;
  const parsed = overviewFiltersSchema.safeParse(filters); if (!parsed.success) return err("VALIDATION", "Проверьте фильтры проектов");
  try {
    return await db.$transaction(async (tx) => {
      const workspaceId = context.data.workspaceId, input = parsed.data, pageSize = 12;
      if (input.projectId && !await tx.project.findUnique({ where: { id_workspaceId: { id: input.projectId, workspaceId } }, select: { id: true } })) return err("NOT_FOUND", "Проект не найден");
      const where = Prisma.sql`p."workspaceId" = ${workspaceId} ${input.status ? Prisma.sql`AND p.status = ${input.status}::"ProjectStatus"` : Prisma.empty} ${input.projectId ? Prisma.sql`AND p.id = ${input.projectId}` : Prisma.empty} ${input.search ? Prisma.sql`AND ${sqlTextMatch(Prisma.sql`concat_ws(' ', p.code, p.name, p.description)`, input.search)}` : Prisma.empty}`;
      const counts = await tx.$queryRaw<{ total: bigint }[]>`SELECT count(*) AS total FROM "Project" p WHERE ${where}`;
      const total = Number(counts[0]?.total ?? 0n), totalPages = Math.ceil(total / pageSize), page = Math.min(input.page, Math.max(1, totalPages));
      const ids = (await tx.$queryRaw<{ id: string }[]>`SELECT p.id FROM "Project" p WHERE ${where} ORDER BY p."updatedAt" DESC, p.id ASC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`).map((row) => row.id);
      if (!ids.length) return ok({ data: [], total, totalPages, page, pageSize, asOf: new Date().toISOString() });
      const [projects, tasks, expenses, team] = await Promise.all([
        tx.project.findMany({ where: { workspaceId, id: { in: ids } }, include: { manager: { select: { user: { select: { id: true, name: true, avatar: true } } } } } }),
        tx.task.groupBy({ by: ["projectId", "status"], where: { workspaceId, projectId: { in: ids } }, _count: { _all: true } }),
        tx.expense.groupBy({ by: ["projectId", "currency"], where: { workspaceId, projectId: { in: ids } }, _sum: { amount: true }, _count: { _all: true } }),
        tx.$queryRaw<TeamRow[]>`${teamCte(workspaceId, ids)}, ranked AS (SELECT *, row_number() OVER (PARTITION BY "projectId" ORDER BY "isManager" DESC, name, id) AS rank, count(*) OVER (PARTITION BY "projectId") AS total FROM team) SELECT "projectId", id, name, avatar, "isManager", active, total FROM ranked WHERE rank <= 6 ORDER BY "projectId", rank`,
      ]);
      const byId = new Map(projects.map((project) => [project.id, project]));
      const data: OverviewProject[] = ids.flatMap((id) => {
        const project = byId.get(id); if (!project) return [];
        const taskCounts = tasks.filter((row) => row.projectId === id), costs = expenses.filter((row) => row.projectId === id), cost = costs.find((row) => row.currency === project.currency), members = team.filter((row) => row.projectId === id);
        return [{ id, code: project.code, name: project.name, description: project.description, status: project.status, budget: project.budget.toFixed(0), currency: project.currency, managerId: project.managerId, manager: project.manager?.user ?? null, startDate: project.startDate?.toISOString().slice(0, 10) ?? null, endDate: project.endDate?.toISOString().slice(0, 10) ?? null, version: project.version,
          tasks: { total: taskCounts.reduce((sum, row) => sum + row._count._all, 0), done: taskCounts.find((row) => row.status === "DONE")?._count._all ?? 0, cancelled: taskCounts.find((row) => row.status === "CANCELLED")?._count._all ?? 0 },
          spent: cost?._sum.amount?.toFixed(0) ?? "0", expenseCount: cost?._count._all ?? 0, otherCurrencies: costs.filter((row) => row.currency !== project.currency).map((row) => ({ currency: row.currency, amount: row._sum.amount?.toFixed(0) ?? "0", count: row._count._all })), team: { total: Number(members[0]?.total ?? 0n), preview: members.map(member) } }];
      });
      return ok({ data, total, page, pageSize, totalPages, asOf: new Date().toISOString() });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15000 });
  } catch (error: unknown) { return getTaskError(error); }
}

/** Read a bounded page of distinct managers and task assignees only after verifying the tenant project. */
export async function getProjectTeam(id: string, filters: { page?: number } = {}): Promise<Result<PaginatedResponse<ProjectTeamMember>>> {
  const context = await getTaskContext(); if (!context.ok) return context;
  const parsed = projectTeamFiltersSchema.safeParse(filters); if (!taskIdSchema.safeParse(id).success || !parsed.success) return err("VALIDATION", "Проверьте проект и страницу команды");
  try {
    return await db.$transaction(async (tx) => {
      const workspaceId = context.data.workspaceId;
      if (!await tx.project.findUnique({ where: { id_workspaceId: { id, workspaceId } }, select: { id: true } })) return err("NOT_FOUND", "Проект не найден");
      const cte = teamCte(workspaceId, [id]), counts = await tx.$queryRaw<{ total: bigint }[]>`${cte} SELECT count(*) AS total FROM team`;
      const total = Number(counts[0]?.total ?? 0n), pageSize = 20, totalPages = Math.ceil(total / pageSize), page = Math.min(parsed.data.page, Math.max(1, totalPages));
      const rows = await tx.$queryRaw<TeamRow[]>`${cte} SELECT *, count(*) OVER () AS total FROM team ORDER BY "isManager" DESC, name, id LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
      return ok({ data: rows.map(member), total, page, pageSize, totalPages });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  } catch (error: unknown) { return getTaskError(error); }
}
