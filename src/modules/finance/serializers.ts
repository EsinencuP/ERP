import type { Prisma } from "@prisma/client";
import { invoiceCustomerSchema } from "./schema";
import type { Invoice } from "./types";

export const invoiceInclude = { contact: { select: { name: true, company: true, email: true, address: true } }, workspace: { select: { name: true } }, items: { orderBy: { position: "asc" } }, payments: { orderBy: [{ receivedAt: "desc" }, { id: "desc" }] } } as const satisfies Prisma.InvoiceInclude;
export type InvoiceRow = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;
/** Keep exact money and snapshots wire-safe; derive overdue without unaudited writes during reads. */
export function toInvoice(row: InvoiceRow, today = new Date().toISOString().slice(0, 10)): Invoice {
  const paid = row.payments.reduce((sum, payment) => sum + BigInt(payment.amount.toFixed(0)), 0n), total = BigInt(row.total.toFixed(0));
  const active = ["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(row.status);
  const status = active ? paid >= total && total > 0n ? "PAID" : row.dueDate.toISOString().slice(0, 10) < today ? "OVERDUE" : "SENT" : row.status === "DRAFT" ? "DRAFT" : row.status === "CANCELLED" ? "CANCELLED" : "PAID";
  const snapshot = invoiceCustomerSchema.safeParse(row.customerSnapshot);
  return { id: row.id, workspaceId: row.workspaceId, number: row.number, contactId: row.contactId, status, storedStatus: row.status, currency: row.currency, subtotal: row.subtotal.toFixed(0), taxRate: row.taxRate.toFixed(2), taxAmount: (total - BigInt(row.subtotal.toFixed(0))).toString(), total: total.toString(), paid: paid.toString(), balance: (total - paid).toString(), issueDate: row.issueDate.toISOString().slice(0, 10), dueDate: row.dueDate.toISOString().slice(0, 10), notes: row.notes, version: row.version, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), customer: snapshot.success ? snapshot.data : row.contact, issuerName: row.issuerName ?? row.workspace.name, items: row.items.map((item) => ({ id: item.id, description: item.description, quantity: item.quantity.toFixed(3), unitPrice: item.unitPrice.toFixed(0), total: item.total.toFixed(0), position: item.position })), payments: row.payments.map((payment) => ({ id: payment.id, amount: payment.amount.toFixed(0), method: payment.method, reference: payment.reference, receivedAt: payment.receivedAt.toISOString(), notes: payment.notes })) };
}
