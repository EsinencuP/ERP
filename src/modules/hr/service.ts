import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import type { Result, SessionContext } from "@/types/shared";
import { getHrContext } from "./access";
import { getHrError } from "./errors";
import { employeeIdSchema, employeeSchema, employeeVersionSchema } from "./schema";
import { toEmployee } from "./serializers";
import type { Employee, EmployeeInput } from "./types";

/** Commit an authorized HR mutation and its audit serializably; retry only a guaranteed P2034 rollback. */
export async function withHrMutation<T>(operation: "create" | "update" | "delete", handleMutation: (tx: Prisma.TransactionClient, session: SessionContext) => Promise<Result<T>>): Promise<Result<T>> {
  const context = await getHrContext(operation); if (!context.ok) return context;
  for (let attempt = 0; attempt < 3; attempt++) { try { return await db.$transaction((tx) => handleMutation(tx, context.data), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 }); } catch (error: unknown) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue; return getHrError(error); } }
  return err("CONFLICT", "Обновите сотрудников перед повтором");
}
async function getVersioned(tx: Prisma.TransactionClient, workspaceId: string, id: string, version: number) {
  if (!employeeIdSchema.safeParse(id).success || !employeeVersionSchema.safeParse(version).success) return err("VALIDATION", "Нужны ID и актуальная версия сотрудника");
  const row = await tx.employee.findUnique({ where: { id_workspaceId: { id, workspaceId } }, include: { manager: { select: { id: true, name: true } } } });
  if (!row) return err("NOT_FOUND", "Сотрудник не найден");
  return row.version === version ? ok(row) : err("CONFLICT", "Сотрудник уже изменён. Обновите каталог");
}
async function getManager(tx: Prisma.TransactionClient, workspaceId: string, managerId: string, employeeId?: string): Promise<Result<null>> {
  if (!managerId) return ok(null);
  const chain = await tx.$queryRaw<{ id: string; managerId: string | null }[]>`WITH RECURSIVE chain AS (
    SELECT id, "managerId" FROM "Employee" WHERE "workspaceId" = ${workspaceId} AND id = ${managerId}
    UNION SELECT e.id, e."managerId" FROM "Employee" e JOIN chain c ON e.id = c."managerId" WHERE e."workspaceId" = ${workspaceId}
  ) SELECT id, "managerId" FROM chain`;
  if (!chain.length) return err("NOT_FOUND", "Руководитель не найден в текущем пространстве");
  if (chain.some((row) => row.id === employeeId) || !chain.some((row) => row.managerId === null)) return err("VALIDATION", "Сотрудник не может быть руководителем себя или своего руководителя");
  return ok(null);
}
async function audit(tx: Prisma.TransactionClient, session: SessionContext, action: "created" | "updated" | "deleted", employee: Employee, before: Employee | null) {
  await tx.auditLog.create({ data: { workspaceId: session.workspaceId, actorId: session.userId, actor: session.name, domain: "hr", action, entityType: "Employee", entityId: employee.id, title: employee.name, before: before ? { ...before } : Prisma.DbNull, after: action === "deleted" ? Prisma.DbNull : { ...employee } } });
}
function fields(input: ReturnType<typeof employeeSchema.parse>) { return { ...input, email: input.email ? input.email.toLowerCase() : null, phone: input.phone || null, position: input.position || null, department: input.department || null, managerId: input.managerId || null, hireDate: new Date(`${input.hireDate}T00:00:00.000Z`) }; }

/** Create a directory profile and audit without creating a login account. */
export async function createEmployee(input: EmployeeInput): Promise<Result<Employee>> {
  return withHrMutation("create", async (tx, session) => {
    const parsed = employeeSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Проверьте поля сотрудника", { fields: parsed.error.flatten() });
    const manager = await getManager(tx, session.workspaceId, parsed.data.managerId); if (!manager.ok) return manager;
    const row = await tx.employee.create({ data: { ...fields(parsed.data), workspaceId: session.workspaceId }, include: { manager: { select: { id: true, name: true } } } });
    const employee = toEmployee(row); await audit(tx, session, "created", employee, null); return ok(employee);
  });
}
/** Edit a captured employee version, rejecting self-reporting and concurrent hierarchy cycles. */
export async function updateEmployee(id: string, version: number, input: EmployeeInput): Promise<Result<Employee>> {
  return withHrMutation("update", async (tx, session) => {
    const before = await getVersioned(tx, session.workspaceId, id, version); if (!before.ok) return before;
    const parsed = employeeSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Проверьте поля сотрудника", { fields: parsed.error.flatten() });
    const manager = await getManager(tx, session.workspaceId, parsed.data.managerId, id); if (!manager.ok) return manager;
    const row = await tx.employee.update({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version }, data: { ...fields(parsed.data), version: { increment: 1 } }, include: { manager: { select: { id: true, name: true } } } });
    const employee = toEmployee(row); await audit(tx, session, "updated", employee, toEmployee(before.data)); return ok(employee);
  });
}
/** Delete only an unreferenced profile; retain employees with reports or leave history. */
export async function deleteEmployee(id: string, version: number): Promise<Result<Employee>> {
  return withHrMutation("delete", async (tx, session) => {
    const before = await getVersioned(tx, session.workspaceId, id, version); if (!before.ok) return before;
    const [reports, leaves, documents, allowances] = await Promise.all([tx.employee.count({ where: { workspaceId: session.workspaceId, managerId: id } }), tx.leave.count({ where: { workspaceId: session.workspaceId, employeeId: id } }), tx.employeeDocumentLink.count({ where: { workspaceId: session.workspaceId, employeeId: id } }), tx.leaveAllowance.count({ where: { workspaceId: session.workspaceId, employeeId: id } })]);
    if (reports || leaves || documents || allowances) return err("CONFLICT", "У сотрудника есть подчинённые, документы или история отпусков/лимитов. Измените статус вместо удаления");
    await tx.employee.delete({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version } });
    const employee = toEmployee(before.data); await audit(tx, session, "deleted", employee, employee); return ok(employee);
  });
}
