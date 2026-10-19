import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import type { PaginatedResponse, Result } from "@/types/shared";
import { getFinanceContext } from "./access";
import { getFinanceError } from "./errors";
import { toExpense } from "./expense-serializers";
import { expenseFiltersSchema, financeRecordIdSchema } from "./schema";
import type { Expense, ExpenseFilters } from "./types";

/** Read a stable tenant expense page with server-side category/currency/search filtering. */
export async function getExpenses(filters: ExpenseFilters = {}): Promise<Result<PaginatedResponse<Expense>>> {
  const context = await getFinanceContext(); if (!context.ok) return context;
  const parsed = expenseFiltersSchema.safeParse(filters); if (!parsed.success) return err("VALIDATION", "Проверьте фильтры расходов");
  const data = parsed.data;
  const where: Prisma.ExpenseWhereInput = {
    workspaceId: context.data.workspaceId,
    ...(data.category ? { category: data.category } : {}), ...(data.currency ? { currency: data.currency } : {}),
    ...(data.search ? { OR: [{ title: { contains: data.search, mode: "insensitive" } }, { notes: { contains: data.search, mode: "insensitive" } }] } : {}),
  };
  try {
    const [rows, total] = await Promise.all([
      db.expense.findMany({ where, orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "asc" }], skip: (data.page - 1) * data.pageSize, take: data.pageSize }),
      db.expense.count({ where }),
    ]);
    return ok({ data: rows.map(toExpense), total, page: data.page, pageSize: data.pageSize, totalPages: Math.ceil(total / data.pageSize) });
  } catch (error: unknown) { return getFinanceError(error); }
}

/** Read one expense exclusively inside the server-resolved workspace. */
export async function getExpense(id: string): Promise<Result<Expense>> {
  const context = await getFinanceContext(); if (!context.ok) return context;
  if (!financeRecordIdSchema.safeParse(id).success) return err("VALIDATION", "Неверный ID расхода");
  try {
    const row = await db.expense.findUnique({ where: { id_workspaceId: { id, workspaceId: context.data.workspaceId } } });
    return row ? ok(toExpense(row)) : err("NOT_FOUND", "Расход не найден");
  } catch (error: unknown) { return getFinanceError(error); }
}
