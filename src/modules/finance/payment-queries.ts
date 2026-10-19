import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import type { PaginatedResponse, Result } from "@/types/shared";
import { getFinanceContext } from "./access";
import { getFinanceError } from "./errors";
import { invoiceCustomerSchema, paymentFiltersSchema } from "./schema";
import { getInvoices } from "./queries";
import type { Invoice, PaymentFilters, PaymentRow } from "./types";

/** Read an authorized payment page and count, keeping exact money and UTC date boundaries. */
export async function getPayments(filters: PaymentFilters = {}): Promise<Result<PaginatedResponse<PaymentRow>>> {
  const context = await getFinanceContext(); if (!context.ok) return context;
  const parsed = paymentFiltersSchema.safeParse(filters); if (!parsed.success) return err("VALIDATION", "Проверьте фильтры и диапазон дат платежей");
  const data = parsed.data;
  const end = data.to ? new Date(new Date(`${data.to}T00:00:00.000Z`).getTime() + 86400000) : undefined;
  const where: Prisma.PaymentWhereInput = {
    workspaceId: context.data.workspaceId,
    invoice: { workspaceId: context.data.workspaceId, ...(data.currency ? { currency: data.currency } : {}) },
    ...(data.method ? { method: data.method } : {}),
    ...(data.from || end ? { receivedAt: { ...(data.from ? { gte: new Date(`${data.from}T00:00:00.000Z`) } : {}), ...(end ? { lt: end } : {}) } } : {}),
    ...(data.search ? { OR: [{ reference: { contains: data.search, mode: "insensitive" } }, { invoice: { number: { contains: data.search, mode: "insensitive" } } }, { invoice: { contact: { OR: [{ name: { contains: data.search, mode: "insensitive" } }, { company: { contains: data.search, mode: "insensitive" } }] } } }] } : {}),
  };
  try {
    const [rows, total] = await Promise.all([
      db.payment.findMany({ where, orderBy: [{ receivedAt: "desc" }, { id: "desc" }], skip: (data.page - 1) * data.pageSize, take: data.pageSize, include: { invoice: { select: { id: true, number: true, currency: true, customerSnapshot: true, contact: { select: { name: true, company: true } } } }, receivedBy: { select: { user: { select: { name: true } } } } } }),
      db.payment.count({ where }),
    ]);
    return ok({ data: rows.map((row) => { const snapshot = invoiceCustomerSchema.safeParse(row.invoice.customerSnapshot); const customer = snapshot.success ? snapshot.data : row.invoice.contact; return { id: row.id, amount: row.amount.toFixed(0), method: row.method, reference: row.reference, receivedAt: row.receivedAt.toISOString(), notes: row.notes, invoiceId: row.invoice.id, invoiceNumber: row.invoice.number, currency: row.invoice.currency, customerName: customer.company || customer.name, receivedBy: row.receivedBy?.user.name ?? null }; }), total, page: data.page, pageSize: data.pageSize, totalPages: Math.ceil(total / data.pageSize) });
  } catch (error: unknown) { return getFinanceError(error); }
}

/** Search bounded sent/overdue invoice options in parallel for the payment picker. */
export async function getPayableInvoices(search = ""): Promise<Result<{ data: Invoice[]; total: number }>> {
  const [sent, overdue] = await Promise.all([getInvoices({ status: "SENT", search, pageSize: 20 }), getInvoices({ status: "OVERDUE", search, pageSize: 20 })]);
  if (!sent.ok) return sent; if (!overdue.ok) return overdue;
  return ok({ data: [...sent.data.data, ...overdue.data.data].filter((invoice) => BigInt(invoice.balance) > 0n), total: sent.data.total + overdue.data.total });
}
