import "server-only";
import { Prisma, type Leave as LeaveRow } from "@prisma/client";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import { canApproveLeave } from "@/lib/permissions";
import { sqlTextMatch } from "@/lib/sql-search";
import type { PaginatedResponse, Result } from "@/types/shared";
import { getHrContext } from "./access";
import { getHrError } from "./errors";
import { leaveFiltersSchema } from "./leave-schema";
import { toLeave } from "./leave-serializers";
import type { Leave, LeaveFilters } from "./types";

/** Read a bounded, literal-searchable leave register using the same tenant conditions for page and count. */
export async function getLeaves(filters: LeaveFilters = {}): Promise<Result<PaginatedResponse<Leave>>> {
  const context = await getHrContext(); if (!context.ok) return context;
  const parsed = leaveFiltersSchema.safeParse(filters); if (!parsed.success) return err("VALIDATION", "Проверьте фильтры отпусков");
  const data = parsed.data, conditions = [Prisma.sql`l."workspaceId" = ${context.data.workspaceId}`];
  if (data.status) conditions.push(Prisma.sql`l.status::text = ${data.status}`);
  if (data.type) conditions.push(Prisma.sql`l.type::text = ${data.type}`);
  if (data.employeeId) conditions.push(Prisma.sql`l."employeeId" = ${data.employeeId}`);
  if (data.search) conditions.push(sqlTextMatch(Prisma.sql`concat_ws(' ', e.name, e."employeeId", e.department)`, data.search));
  const where = Prisma.join(conditions, " AND "), from = Prisma.sql`FROM "Leave" l JOIN "Employee" e ON e.id = l."employeeId" AND e."workspaceId" = l."workspaceId"`;
  try {
    const [rows, counts] = await Promise.all([
      db.$queryRaw<(LeaveRow & { employee: Leave["employee"]; decidedBy: string | null })[]>(Prisma.sql`SELECT l.*, jsonb_build_object('name', e.name, 'employeeId', e."employeeId", 'department', e.department) AS employee, u.name AS "decidedBy" ${from} LEFT JOIN "Membership" m ON m."workspaceId" = l."workspaceId" AND m."userId" = l."approvedById" LEFT JOIN "User" u ON u.id = m."userId" WHERE ${where} ORDER BY l."createdAt" DESC, l.id ASC LIMIT ${data.pageSize} OFFSET ${(data.page - 1) * data.pageSize}`),
      db.$queryRaw<{ total: number }[]>(Prisma.sql`SELECT COUNT(*)::int AS total ${from} WHERE ${where}`),
    ]);
    const total = counts[0]?.total ?? 0; return ok({ data: rows.map((row) => toLeave(row, row.employee, row.decidedBy)), total, page: data.page, pageSize: data.pageSize, totalPages: Math.ceil(total / data.pageSize) });
  } catch (error: unknown) { return getHrError(error); }
}

/** Count all workspace PENDING applications only for a currently authorized approver. */
export async function getLeavePendingCount(): Promise<Result<number>> {
  const context = await getHrContext(); if (!context.ok) return context;
  if (!canApproveLeave(context.data.role)) return err("FORBIDDEN", "Нет права на согласование отпусков");
  try { return ok(await db.leave.count({ where: { workspaceId: context.data.workspaceId, status: "PENDING" } })); }
  catch (error: unknown) { return getHrError(error); }
}
