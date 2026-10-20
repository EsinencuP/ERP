import "server-only";
import { Prisma } from "@prisma/client";
import { err, ok } from "@/lib/errors";
import type { Result, SessionContext } from "@/types/shared";
import { withFinanceMutation } from "./mutations";
import { toExpense } from "./expense-serializers";
import { expenseSchema, financeRecordIdSchema, financeVersionSchema } from "./schema";
import type { Expense, ExpenseInput } from "./types";

async function getVersionedExpense(tx: Prisma.TransactionClient, session: SessionContext, id: string, version: number) {
  if (!financeRecordIdSchema.safeParse(id).success || !financeVersionSchema.safeParse(version).success) return err("VALIDATION", "Нужны ID и актуальная версия расхода");
  const row = await tx.expense.findUnique({ where: { id_workspaceId: { id, workspaceId: session.workspaceId } } });
  if (!row) return err("NOT_FOUND", "Расход не найден");
  return row.version === version ? ok(row) : err("CONFLICT", "Расход уже изменён. Обновите данные");
}

async function auditExpense(tx: Prisma.TransactionClient, session: SessionContext, action: "created" | "updated" | "deleted", expense: Expense, before: Expense | null) {
  await tx.auditLog.create({ data: { workspaceId: session.workspaceId, actor: session.name, actorId: session.userId, domain: "finance", action, entityType: "Expense", entityId: expense.id, title: expense.title, before: before ? { ...before } : Prisma.DbNull, after: action === "deleted" ? Prisma.DbNull : { ...expense } } });
}

/** Create a validated expense and audit snapshot in one authorized transaction. */
export async function createExpense(input: ExpenseInput): Promise<Result<Expense>> {
  return withFinanceMutation("create", async (tx, session) => {
    const parsed = expenseSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Проверьте поля расхода", { fields: parsed.error.flatten() });
    const data = parsed.data;
    if (data.projectId && !await tx.project.findUnique({ where: { id_workspaceId: { id: data.projectId, workspaceId: session.workspaceId } }, select: { id: true } })) return err("NOT_FOUND", "Проект не найден");
    const row = await tx.expense.create({ data: { ...data, projectId: data.projectId || null, workspaceId: session.workspaceId, createdById: session.userId, date: new Date(`${data.date}T00:00:00.000Z`), receipt: data.receipt || null, notes: data.notes || null } });
    const expense = toExpense(row); await auditExpense(tx, session, "created", expense, null); return ok(expense);
  });
}

/** Update all expense fields using the aggregate version and an atomic before/after audit. */
export async function updateExpense(id: string, version: number, input: ExpenseInput): Promise<Result<Expense>> {
  return withFinanceMutation("update", async (tx, session) => {
    const existing = await getVersionedExpense(tx, session, id, version); if (!existing.ok) return existing;
    const parsed = expenseSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Проверьте поля расхода", { fields: parsed.error.flatten() });
    const data = parsed.data;
    if (data.projectId && !await tx.project.findUnique({ where: { id_workspaceId: { id: data.projectId, workspaceId: session.workspaceId } }, select: { id: true } })) return err("NOT_FOUND", "Проект не найден");
    const row = await tx.expense.update({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version }, data: { ...data, projectId: data.projectId === undefined ? existing.data.projectId : data.projectId || null, date: new Date(`${data.date}T00:00:00.000Z`), receipt: data.receipt || null, notes: data.notes || null, version: { increment: 1 } } });
    const expense = toExpense(row); await auditExpense(tx, session, "updated", expense, toExpense(existing.data)); return ok(expense);
  });
}

/** Delete a current-version expense only for roles with canDelete, retaining the audit history. */
export async function deleteExpense(id: string, version: number): Promise<Result<Expense>> {
  return withFinanceMutation("delete", async (tx, session) => {
    const existing = await getVersionedExpense(tx, session, id, version); if (!existing.ok) return existing;
    const expense = toExpense(existing.data);
    await tx.expense.delete({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version } });
    await auditExpense(tx, session, "deleted", expense, expense); return ok(expense);
  });
}
