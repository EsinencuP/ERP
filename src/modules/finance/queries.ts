import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import type { Result, PaginatedResponse } from "@/types/shared";
import { getFinanceContext } from "./access";
import { getFinanceError } from "./errors";
import { invoiceFiltersSchema, invoiceIdSchema } from "./schema";
import { invoiceInclude, toInvoice } from "./serializers";
import type { Invoice, InvoiceFilters } from "./types";
/** Read a bounded invoice page and count from a consistent tenant snapshot. */
export async function getInvoices(filters: InvoiceFilters = {}): Promise<Result<PaginatedResponse<Invoice>>> {
  const context = await getFinanceContext(); if (!context.ok) return context;
  const parsed = invoiceFiltersSchema.safeParse(filters); if (!parsed.success) return err("VALIDATION", "Неверные фильтры счетов");
  const data = parsed.data, today = new Date(context.data.today);
  const where: Prisma.InvoiceWhereInput = { workspaceId: context.data.workspaceId, ...(data.search ? { OR: [{ number: { contains: data.search, mode: "insensitive" } }, { contact: { name: { contains: data.search, mode: "insensitive" } } }] } : {}), ...(data.status === "OVERDUE" ? { status: { in: ["SENT", "OVERDUE", "PARTIALLY_PAID"] }, dueDate: { lt: today } } : data.status === "SENT" ? { status: { in: ["SENT", "OVERDUE", "PARTIALLY_PAID"] }, dueDate: { gte: today } } : data.status ? { status: data.status } : {}) };
  try {
    const [rows, total] = await db.$transaction([db.invoice.findMany({ where, include: invoiceInclude, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (data.page - 1) * data.pageSize, take: data.pageSize }), db.invoice.count({ where })], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return ok({ data: rows.map((row) => toInvoice(row, context.data.today)), total, page: data.page, pageSize: data.pageSize, totalPages: Math.ceil(total / data.pageSize) });
  } catch (error: unknown) { return getFinanceError(error); }
}
/** Read an invoice with ordered lines/payments only inside the current workspace. */
export async function getInvoice(id: string): Promise<Result<Invoice>> {
  const context = await getFinanceContext(); if (!context.ok) return context;
  if (!invoiceIdSchema.safeParse(id).success) return err("VALIDATION", "Неверный ID счёта");
  try { const row = await db.invoice.findUnique({ where: { id_workspaceId: { id, workspaceId: context.data.workspaceId } }, include: invoiceInclude }); return row ? ok(toInvoice(row, context.data.today)) : err("NOT_FOUND", "Счёт не найден"); }
  catch (error: unknown) { return getFinanceError(error); }
}
