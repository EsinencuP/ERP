import "server-only";
import { Prisma } from "@prisma/client";
import { err, ok } from "@/lib/errors";
import { canApproveLeave } from "@/lib/permissions";
import type { Result } from "@/types/shared";
import { employeeIdSchema, employeeVersionSchema } from "./schema";
import { getLeaveDays } from "./leave-days";
import { leaveSchema, leaveDecisionSchema } from "./leave-schema";
import { toLeave } from "./leave-serializers";
import { withHrMutation } from "./service";
import type { Leave, LeaveInput } from "./types";

/** Create an authoritative PENDING request with inclusive weekdays and atomic overlap protection/audit. */
export async function createLeave(input: LeaveInput): Promise<Result<Leave>> {
  return withHrMutation("create", async (tx, session) => {
    const parsed = leaveSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Проверьте сотрудника, тип и даты отпуска", { fields: parsed.error.flatten() });
    const data = parsed.data, days = getLeaveDays(data.startDate, data.endDate); if (!days.ok) return days;
    const employee = await tx.employee.findUnique({ where: { id_workspaceId: { id: data.employeeId, workspaceId: session.workspaceId } }, select: { name: true, employeeId: true, department: true, status: true } });
    if (!employee) return err("NOT_FOUND", "Сотрудник не найден");
    if (employee.status === "TERMINATED") return err("CONFLICT", "Нельзя создать отпуск для неактивного сотрудника");
    const startDate = new Date(`${data.startDate}T00:00:00.000Z`), endDate = new Date(`${data.endDate}T00:00:00.000Z`);
    const overlap = await tx.leave.count({ where: { workspaceId: session.workspaceId, employeeId: data.employeeId, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: endDate }, endDate: { gte: startDate } } });
    if (overlap) return err("CONFLICT", "У сотрудника уже есть ожидающая или одобренная заявка на этот период");
    const row = await tx.leave.create({ data: { workspaceId: session.workspaceId, employeeId: data.employeeId, type: data.type, startDate, endDate, days: String(days.data), reason: data.reason || null, status: "PENDING" } });
    const leave = toLeave(row, { name: employee.name, employeeId: employee.employeeId, department: employee.department }, null);
    await tx.auditLog.create({ data: { workspaceId: session.workspaceId, actorId: session.userId, actor: session.name, domain: "hr", action: "created", entityType: "Leave", entityId: row.id, title: `Отпуск · ${employee.name}`, before: Prisma.DbNull, after: { ...leave } } });
    return ok(leave);
  });
}

/** Decide a captured PENDING version once; recheck approver role, employee and overlapping approved history. */
export async function updateLeaveStatus(id: string, version: number, status: "APPROVED" | "REJECTED"): Promise<Result<Leave>> {
  return withHrMutation("update", async (tx, session) => {
    if (!canApproveLeave(session.role)) return err("FORBIDDEN", "Согласование отпусков доступно менеджеру и администраторам");
    if (!employeeIdSchema.safeParse(id).success || !employeeVersionSchema.safeParse(version).success || !leaveDecisionSchema.safeParse(status).success) return err("VALIDATION", "Нужны ID, актуальная версия и решение APPROVED / REJECTED");
    const before = await tx.leave.findUnique({ where: { id_workspaceId: { id, workspaceId: session.workspaceId } }, include: { employee: { select: { name: true, employeeId: true, department: true, status: true } }, approvedBy: { select: { user: { select: { name: true } } } } } });
    if (!before) return err("NOT_FOUND", "Заявка не найдена");
    if (before.version !== version || before.status !== "PENDING") return err("CONFLICT", "Заявка уже изменена или рассмотрена. Обновите список");
    if (status === "APPROVED") {
      if (before.employee.status === "TERMINATED") return err("CONFLICT", "Сотрудник неактивен. Заявку можно отклонить");
      const overlap = await tx.leave.count({ where: { workspaceId: session.workspaceId, employeeId: before.employeeId, id: { not: id }, status: "APPROVED", startDate: { lte: before.endDate }, endDate: { gte: before.startDate } } });
      if (overlap) return err("CONFLICT", "На этот период уже одобрен другой отпуск");
    }
    const employee = { name: before.employee.name, employeeId: before.employee.employeeId, department: before.employee.department };
    const row = await tx.leave.update({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version, status: "PENDING" }, data: { status, approvedById: session.userId, version: { increment: 1 } } });
    const leave = toLeave(row, employee, session.name);
    await tx.auditLog.create({ data: { workspaceId: session.workspaceId, actorId: session.userId, actor: session.name, domain: "hr", action: "updated", entityType: "Leave", entityId: id, title: `Отпуск · ${employee.name}`, before: { ...toLeave(before, employee, before.approvedBy?.user.name ?? null) }, after: { ...leave } } });
    return ok(leave);
  });
}
