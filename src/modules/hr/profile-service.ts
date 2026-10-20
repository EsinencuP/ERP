import "server-only";
import { Prisma } from "@prisma/client";
import { err, ok } from "@/lib/errors";
import { canApproveLeave } from "@/lib/permissions";
import type { Result, SessionContext } from "@/types/shared";
import { withHrMutation } from "./service";
import { employeeIdSchema, employeeVersionSchema } from "./schema";
import { employeeDocumentLinkSchema, leaveAllowanceSchema } from "./profile-schema";
import { toEmployeeDocumentLink, toLeaveAllowance } from "./profile-serializers";
import type { EmployeeDocumentLink, EmployeeDocumentLinkInput, LeaveAllowance, LeaveAllowanceInput } from "./types";

async function audit(tx: Prisma.TransactionClient, session: SessionContext, action: "created" | "updated" | "deleted", entityType: string, entityId: string, title: string, before: Prisma.InputJsonObject | null, after: Prisma.InputJsonObject | null) { await tx.auditLog.create({ data: { workspaceId: session.workspaceId, actorId: session.userId, actor: session.name, domain: "hr", action, entityType, entityId, title, before: before ?? Prisma.DbNull, after: after ?? Prisma.DbNull } }); }

/** Attach an external document reference to an existing tenant employee; no server-side URL fetch occurs. */
export async function createEmployeeDocumentLink(employeeId: string, input: EmployeeDocumentLinkInput): Promise<Result<EmployeeDocumentLink>> {
  return withHrMutation("create", async (tx, session) => {
    const parsed = employeeDocumentLinkSchema.safeParse(input); if (!employeeIdSchema.safeParse(employeeId).success || !parsed.success) return err("VALIDATION", "Проверьте сотрудника и ссылку на документ");
    if (!await tx.employee.findUnique({ where: { id_workspaceId: { id: employeeId, workspaceId: session.workspaceId } }, select: { id: true } })) return err("NOT_FOUND", "Сотрудник не найден");
    const row = await tx.employeeDocumentLink.create({ data: { ...parsed.data, notes: parsed.data.notes || null, employeeId, workspaceId: session.workspaceId } }), document = toEmployeeDocumentLink(row);
    await audit(tx, session, "created", "EmployeeDocumentLink", row.id, document.title, null, { ...document }); return ok(document);
  });
}
/** Update a captured document version within its workspace without changing employee ownership. */
export async function updateEmployeeDocumentLink(id: string, version: number, input: EmployeeDocumentLinkInput): Promise<Result<EmployeeDocumentLink>> {
  return withHrMutation("update", async (tx, session) => {
    const parsed = employeeDocumentLinkSchema.safeParse(input); if (!employeeIdSchema.safeParse(id).success || !employeeVersionSchema.safeParse(version).success || !parsed.success) return err("VALIDATION", "Проверьте документ и его версию");
    const before = await tx.employeeDocumentLink.findUnique({ where: { id_workspaceId: { id, workspaceId: session.workspaceId } } }); if (!before) return err("NOT_FOUND", "Документ не найден"); if (before.version !== version) return err("CONFLICT", "Документ уже изменён. Обновите профиль");
    const row = await tx.employeeDocumentLink.update({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version }, data: { ...parsed.data, notes: parsed.data.notes || null, version: { increment: 1 } } }), document = toEmployeeDocumentLink(row);
    await audit(tx, session, "updated", "EmployeeDocumentLink", id, document.title, { ...toEmployeeDocumentLink(before) }, { ...document }); return ok(document);
  });
}
/** Delete an employee document reference only with current version and existing HR deletion permission. */
export async function deleteEmployeeDocumentLink(id: string, version: number): Promise<Result<EmployeeDocumentLink>> {
  return withHrMutation("delete", async (tx, session) => {
    if (!employeeIdSchema.safeParse(id).success || !employeeVersionSchema.safeParse(version).success) return err("VALIDATION", "Нужны ID и актуальная версия документа");
    const before = await tx.employeeDocumentLink.findUnique({ where: { id_workspaceId: { id, workspaceId: session.workspaceId } } }); if (!before) return err("NOT_FOUND", "Документ не найден"); if (before.version !== version) return err("CONFLICT", "Документ уже изменён. Обновите профиль");
    await tx.employeeDocumentLink.delete({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version } }); const document = toEmployeeDocumentLink(before); await audit(tx, session, "deleted", "EmployeeDocumentLink", id, document.title, { ...document }, null); return ok(document);
  });
}
/** Set an explicit yearly whole-workday allowance using version zero only for an absent allocation. */
export async function updateEmployeeLeaveAllowance(employeeId: string, version: number, input: LeaveAllowanceInput): Promise<Result<LeaveAllowance>> {
  return withHrMutation("update", async (tx, session) => {
    if (!canApproveLeave(session.role)) return err("FORBIDDEN", "Лимит отпуска назначает менеджер или администратор");
    const parsed = leaveAllowanceSchema.safeParse(input); if (!employeeIdSchema.safeParse(employeeId).success || !Number.isInteger(version) || version < 0 || version > 2147483646 || !parsed.success) return err("VALIDATION", "Проверьте сотрудника, год, лимит и версию");
    if (!await tx.employee.findUnique({ where: { id_workspaceId: { id: employeeId, workspaceId: session.workspaceId } }, select: { id: true } })) return err("NOT_FOUND", "Сотрудник не найден");
    const before = await tx.leaveAllowance.findUnique({ where: { workspaceId_employeeId_year: { workspaceId: session.workspaceId, employeeId, year: parsed.data.year } } });
    if ((before?.version ?? 0) !== version) return err("CONFLICT", "Лимит уже изменён. Обновите профиль");
    const row = before ? await tx.leaveAllowance.update({ where: { id_workspaceId: { id: before.id, workspaceId: session.workspaceId }, version }, data: { days: parsed.data.days, version: { increment: 1 } } }) : await tx.leaveAllowance.create({ data: { workspaceId: session.workspaceId, employeeId, year: parsed.data.year, days: parsed.data.days } });
    const allowance = toLeaveAllowance(row); await audit(tx, session, before ? "updated" : "created", "LeaveAllowance", row.id, `Лимит отпуска · ${row.year}`, before ? { ...toLeaveAllowance(before) } : null, { ...allowance }); return ok(allowance);
  });
}
