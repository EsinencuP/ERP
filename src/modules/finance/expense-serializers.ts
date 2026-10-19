import type { Expense as ExpenseRecord } from "@prisma/client";
import type { Expense } from "./types";

/** Serialize persisted expenses without converting Decimal money into Number or shifting DATE values. */
export function toExpense(row: ExpenseRecord): Expense {
  return { ...row, amount: row.amount.toFixed(0), date: row.date.toISOString().slice(0, 10), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
