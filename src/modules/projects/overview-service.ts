import "server-only";
import { Prisma } from "@prisma/client";
import { err, ok } from "@/lib/errors";
import type { Result, SessionContext } from "@/types/shared";
import { taskIdSchema, taskVersionSchema } from "./task-schema";
import { overviewProjectSchema } from "./overview-schema";
import { withProjectsMutation } from "./task-service";
import type { OverviewProjectInput } from "./overview-types";

function snapshot(row: Prisma.ProjectGetPayload<Record<string, never>>) { return { id: row.id, code: row.code, name: row.name, description: row.description, status: row.status, budget: row.budget.toFixed(0), currency: row.currency, managerId: row.managerId, startDate: row.startDate?.toISOString().slice(0, 10) ?? null, endDate: row.endDate?.toISOString().slice(0, 10) ?? null, version: row.version }; }
async function audit(tx: Prisma.TransactionClient, session: SessionContext, after: ReturnType<typeof snapshot>, before: ReturnType<typeof snapshot> | null) { await tx.auditLog.create({ data: { workspaceId: session.workspaceId, actorId: session.userId, actor: session.name, domain: "projects", entityType: "Project", entityId: after.id, title: after.name, action: before ? "updated" : "created", before: before ?? Prisma.DbNull, after } }); }
async function managerAllowed(tx: Prisma.TransactionClient, workspaceId: string, id: string) { return !id || Boolean(await tx.membership.findFirst({ where: { workspaceId, userId: id, isActive: true, user: { isActive: true } }, select: { userId: true } })); }
function fields(input: ReturnType<typeof overviewProjectSchema.parse>) { return { ...input, description: input.description || null, managerId: input.managerId || null, startDate: input.startDate ? new Date(`${input.startDate}T00:00:00Z`) : null, endDate: input.endDate ? new Date(`${input.endDate}T00:00:00Z`) : null }; }

/** Create a planned project with an exact budget, optional manager and explicit calendar period. */
export async function createOverviewProject(input: OverviewProjectInput): Promise<Result<{ id: string; version: number }>> {
  return withProjectsMutation("create", async (tx, session) => {
    const parsed = overviewProjectSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Проверьте данные проекта");
    if (!await managerAllowed(tx, session.workspaceId, parsed.data.managerId)) return err("VALIDATION", "Руководитель должен быть активным участником пространства");
    const row = await tx.project.create({ data: { ...fields(parsed.data), workspaceId: session.workspaceId } });
    await audit(tx, session, snapshot(row), null); return ok({ id: row.id, version: row.version });
  });
}

/** Update a project plan using its captured version, preserving contact and task ownership. */
export async function updateOverviewProject(id: string, version: number, input: OverviewProjectInput): Promise<Result<{ id: string; version: number }>> {
  return withProjectsMutation("update", async (tx, session) => {
    if (!taskIdSchema.safeParse(id).success || !taskVersionSchema.safeParse(version).success) return err("VALIDATION", "Нужны ID и актуальная версия проекта");
    const parsed = overviewProjectSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Проверьте данные проекта");
    const before = await tx.project.findUnique({ where: { id_workspaceId: { id, workspaceId: session.workspaceId } } }); if (!before) return err("NOT_FOUND", "Проект не найден");
    if (before.version !== version) return err("CONFLICT", "Проект уже изменён. Обновите обзор");
    if (parsed.data.managerId !== (before.managerId ?? "") && !await managerAllowed(tx, session.workspaceId, parsed.data.managerId)) return err("VALIDATION", "Руководитель должен быть активным участником пространства");
    const row = await tx.project.update({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version }, data: { ...fields(parsed.data), version: { increment: 1 } } });
    await audit(tx, session, snapshot(row), snapshot(before)); return ok({ id: row.id, version: row.version });
  });
}
