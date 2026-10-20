import "server-only";
import { Prisma, type Employee as EmployeeRow } from "@prisma/client";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import { sqlTextMatch } from "@/lib/sql-search";
import type { PaginatedResponse, Result } from "@/types/shared";
import { getHrContext } from "./access";
import { getHrError } from "./errors";
import { employeeFiltersSchema, employeeIdSchema } from "./schema";
import { toEmployee } from "./serializers";
import type { Employee, EmployeeFilters, OrgEmployee } from "./types";

/** Read a bounded directory page, with literal search and workspace-scoped filters. */
export async function getEmployees(filters: EmployeeFilters = {}): Promise<Result<PaginatedResponse<Employee>>> {
  const context = await getHrContext(); if (!context.ok) return context;
  const parsed = employeeFiltersSchema.safeParse(filters); if (!parsed.success) return err("VALIDATION", "Проверьте фильтры сотрудников");
  const data = parsed.data, conditions = [Prisma.sql`e."workspaceId" = ${context.data.workspaceId}`];
  if (data.status) conditions.push(Prisma.sql`e.status::text = ${data.status}`);
  if (data.department !== undefined) conditions.push(Prisma.sql`e.department = ${data.department}`);
  if (data.search) conditions.push(sqlTextMatch(Prisma.sql`concat_ws(' ', e.name, e."employeeId", e.position, e.department, e.email)`, data.search));
  const where = Prisma.join(conditions, " AND ");
  try {
    const [rows, counts] = await Promise.all([
      db.$queryRaw<(EmployeeRow & { manager: { id: string; name: string } | null })[]>(Prisma.sql`SELECT e.*, CASE WHEN m.id IS NULL THEN NULL ELSE jsonb_build_object('id', m.id, 'name', m.name) END AS manager FROM "Employee" e LEFT JOIN "Employee" m ON m.id = e."managerId" AND m."workspaceId" = e."workspaceId" WHERE ${where} ORDER BY e.name ASC, e.id ASC LIMIT ${data.pageSize} OFFSET ${(data.page - 1) * data.pageSize}`),
      db.$queryRaw<{ total: number }[]>(Prisma.sql`SELECT COUNT(*)::int AS total FROM "Employee" e WHERE ${where}`),
    ]);
    const total = counts[0]?.total ?? 0;
    return ok({ data: rows.map(toEmployee), total, page: data.page, pageSize: data.pageSize, totalPages: Math.ceil(total / data.pageSize) });
  } catch (error: unknown) { return getHrError(error); }
}

/** Read one authorized profile without disclosing another workspace's employees. */
export async function getEmployee(id: string): Promise<Result<Employee>> {
  const context = await getHrContext(); if (!context.ok) return context;
  if (!employeeIdSchema.safeParse(id).success) return err("VALIDATION", "Укажите сотрудника");
  try { const row = await db.employee.findUnique({ where: { id_workspaceId: { id, workspaceId: context.data.workspaceId } }, include: { manager: { select: { id: true, name: true } } } }); return row ? ok(toEmployee(row)) : err("NOT_FOUND", "Сотрудник не найден"); }
  catch (error: unknown) { return getHrError(error); }
}

/** Read bounded distinct department names for the directory filter. */
export async function getEmployeeDepartments(): Promise<Result<string[]>> {
  const context = await getHrContext(); if (!context.ok) return context;
  try { const rows = await db.$queryRaw<{ department: string }[]>`SELECT DISTINCT department FROM "Employee" WHERE "workspaceId" = ${context.data.workspaceId} AND department IS NOT NULL AND department <> '' ORDER BY department ASC LIMIT 501`; if (rows.length > 500) return err("VALIDATION", "Более 500 отделов: используйте поиск сотрудников"); return ok(rows.map((row) => row.department)); }
  catch (error: unknown) { return getHrError(error); }
}

/** Read a complete bounded hierarchy; reject corrupt cycles instead of hiding disconnected employees. */
export async function getEmployeeOrgChart(): Promise<Result<OrgEmployee[]>> {
  const context = await getHrContext(); if (!context.ok) return context;
  try {
    const rows = await db.employee.findMany({ where: { workspaceId: context.data.workspaceId }, select: { id: true, employeeId: true, name: true, department: true, position: true, status: true, managerId: true }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 2001 });
    if (rows.length > 2000) return err("VALIDATION", "Оргструктура поддерживает до 2000 сотрудников. Используйте каталог для большего рабочего пространства");
    const parents = new Map(rows.map((row) => [row.id, row.managerId])), validated = new Set<string>();
    for (const row of rows) { const path = new Set<string>(); let current: string | null = row.id; while (current && !validated.has(current)) { if (path.has(current) || !parents.has(current)) return err("CONFLICT", "Обнаружена некорректная связь руководителей. Исправьте её в каталоге сотрудников"); path.add(current); current = parents.get(current) ?? null; } for (const id of path) validated.add(id); }
    return ok(rows);
  } catch (error: unknown) { return getHrError(error); }
}
