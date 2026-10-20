import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import type { Result } from "@/types/shared";
import { getHrContext } from "./access";
import { getHrError } from "./errors";
import { getEmployee } from "./queries";
import { employeeIdSchema } from "./schema";
import { employeeProfileFiltersSchema, getCurrentLeaveYear } from "./profile-schema";
import { toEmployeeDocumentLink } from "./profile-serializers";
import type { EmployeeProfile, EmployeeProfileFilters } from "./types";

type BalanceRow = { id: string | null; days: Prisma.Decimal | null; version: number | null; approved: Prisma.Decimal; pending: Prisma.Decimal };

/** Read an authorized employee profile with paginated documents, manager and exact calendar-year leave balance. */
export async function getEmployeeProfile(id: string, filters: EmployeeProfileFilters = {}): Promise<Result<EmployeeProfile>> {
  const context = await getHrContext(); if (!context.ok) return context;
  if (!employeeIdSchema.safeParse(id).success) return err("VALIDATION", "Укажите сотрудника");
  const parsed = employeeProfileFiltersSchema.safeParse(filters); if (!parsed.success) return err("VALIDATION", "Проверьте год и страницу документов");
  const employee = await getEmployee(id); if (!employee.ok) return employee;
  const workspaceId = context.data.workspaceId, year = parsed.data.year ?? getCurrentLeaveYear(), page = parsed.data.documentsPage, pageSize = 10, from = `${year}-01-01`, to = `${year}-12-31`;
  try {
    const [documents, count, manager, balances] = await Promise.all([
      db.employeeDocumentLink.findMany({ where: { workspaceId, employeeId: id }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
      db.employeeDocumentLink.count({ where: { workspaceId, employeeId: id } }),
      employee.data.managerId ? db.employee.findUnique({ where: { id_workspaceId: { id: employee.data.managerId, workspaceId } }, select: { id: true, employeeId: true, name: true, position: true, department: true, status: true, managerId: true } }) : Promise.resolve(null),
      db.$queryRaw<BalanceRow[]>`WITH weekdays AS (
        SELECT day::date AS day FROM generate_series(${from}::timestamp, ${to}::timestamp, interval '1 day') AS c(day)
        WHERE extract(isodow FROM day) BETWEEN 1 AND 5
      ), counts AS (
        SELECT l.status, COUNT(*)::numeric AS days FROM "Leave" l JOIN weekdays c ON c.day BETWEEN l."startDate" AND l."endDate"
        WHERE l."workspaceId" = ${workspaceId} AND l."employeeId" = ${id} AND l.type = 'ANNUAL' AND l.status IN ('APPROVED', 'PENDING')
          AND l."startDate" <= ${to}::date AND l."endDate" >= ${from}::date GROUP BY l.status
      ) SELECT a.id, a.days, a.version, COALESCE((SELECT days FROM counts WHERE status = 'APPROVED'), 0) AS approved,
        COALESCE((SELECT days FROM counts WHERE status = 'PENDING'), 0) AS pending
        FROM (SELECT 1) seed LEFT JOIN "LeaveAllowance" a ON a."workspaceId" = ${workspaceId} AND a."employeeId" = ${id} AND a.year = ${year}`,
    ]);
    const row = balances[0]; if (!row) return err("STORAGE", "Не удалось прочитать баланс отпусков");
    const allowance = row.id !== null && row.days !== null && row.version !== null ? { id: row.id, employeeId: id, year, days: row.days.toFixed(0), version: row.version } : null;
    const approved = row.approved.toFixed(0), pending = row.pending.toFixed(0);
    return ok({ employee: employee.data, manager, documents: { data: documents.map(toEmployeeDocumentLink), total: count, page, pageSize, totalPages: Math.ceil(count / pageSize) }, leaveBalance: { year, allowance, approved, pending, remaining: allowance ? (BigInt(allowance.days) - BigInt(approved)).toString() : null } });
  } catch (error: unknown) { return getHrError(error); }
}
