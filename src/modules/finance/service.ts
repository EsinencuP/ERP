import "server-only";
import { Prisma } from "@prisma/client";
import { err, ok } from "@/lib/errors";
import { generateId } from "@/lib/utils";
import type { Result, SessionContext } from "@/types/shared";
import { calculateInvoice } from "./calculations";
import { withFinanceMutation as withMutation } from "./mutations";
import { invoiceIdSchema, invoicePaymentSchema, invoiceSchema, invoiceVersionSchema } from "./schema";
import { invoiceInclude, toInvoice, type InvoiceRow } from "./serializers";
import type { Invoice, InvoiceInput, InvoicePaymentInput } from "./types";
type Transaction = Prisma.TransactionClient;
async function getVersioned(tx: Transaction, session: SessionContext, id: string, version: number): Promise<Result<InvoiceRow>> {
  if (!invoiceIdSchema.safeParse(id).success || !invoiceVersionSchema.safeParse(version).success) return err("VALIDATION", "Нужны ID и актуальная версия счёта");
  const row = await tx.invoice.findUnique({ where: { id_workspaceId: { id, workspaceId: session.workspaceId } }, include: invoiceInclude });
  if (!row) return err("NOT_FOUND", "Счёт не найден");
  return row.version === version ? ok(row) : err("CONFLICT", "Счёт уже изменён. Обновите данные");
}
async function audit(tx: Transaction, session: SessionContext, action: string, invoice: Invoice, before: Invoice | null) {
  await tx.auditLog.create({ data: { workspaceId: session.workspaceId, actor: session.name, actorId: session.userId, domain: "finance", action, entityType: "Invoice", entityId: invoice.id, title: invoice.number, before: before ? JSON.parse(JSON.stringify(before)) as Prisma.InputJsonObject : Prisma.DbNull, after: action === "deleted" ? Prisma.DbNull : JSON.parse(JSON.stringify(invoice)) as Prisma.InputJsonObject } });
}
async function getInput(tx: Transaction, session: SessionContext, input: InvoiceInput) {
  const parsed = invoiceSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Проверьте поля счёта", { fields: parsed.error.flatten() });
  const amounts = calculateInvoice(parsed.data.items, parsed.data.taxRate); if (!amounts.ok) return amounts;
  if (BigInt(amounts.data.total) <= 0n) return err("VALIDATION", "Итог счёта должен быть больше нуля");
  const customer = await tx.contact.findUnique({ where: { id_workspaceId: { id: parsed.data.contactId, workspaceId: session.workspaceId } }, select: { name: true, company: true, email: true, address: true } });
  if (!customer) return err("NOT_FOUND", "Контакт не найден в текущем пространстве");
  return ok({ input: parsed.data, amounts: amounts.data, customer });
}
function itemData(input: InvoiceInput, totals: string[]): Prisma.InvoiceItemUncheckedCreateWithoutInvoiceInput[] { return input.items.map((item, position) => ({ position, description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, total: totals[position] ?? "0" })); }
/** Allocate a persistent yearly invoice number and create lines and audit atomically. */
export async function createInvoice(input: InvoiceInput): Promise<Result<Invoice>> {
  return withMutation("create", async (tx, session) => {
    const validated = await getInput(tx, session, input); if (!validated.ok) return validated;
    const { input: data, amounts, customer } = validated.data, year = Number(data.issueDate.slice(0, 4));
    const sequence = await tx.invoiceSequence.upsert({ where: { workspaceId_year: { workspaceId: session.workspaceId, year } }, create: { workspaceId: session.workspaceId, year, value: 1 }, update: { value: { increment: 1 } } });
    const row = await tx.invoice.create({ data: { workspaceId: session.workspaceId, contactId: data.contactId, createdById: session.userId, number: generateId("INV", { year, value: sequence.value }), currency: data.currency, subtotal: amounts.subtotal, taxRate: data.taxRate, total: amounts.total, issueDate: new Date(data.issueDate), dueDate: new Date(data.dueDate), notes: data.notes || null, customerSnapshot: customer, issuerName: session.workspaceName, items: { create: itemData(data, amounts.lineTotals) } }, include: invoiceInclude });
    const invoice = toInvoice(row); await audit(tx, session, "created", invoice, null); return ok(invoice);
  });
}
/** Replace draft lines as a versioned aggregate; issued invoices remain immutable. */
export async function updateInvoice(id: string, version: number, input: InvoiceInput): Promise<Result<Invoice>> {
  return withMutation("update", async (tx, session) => {
    const existing = await getVersioned(tx, session, id, version); if (!existing.ok) return existing;
    if (existing.data.status !== "DRAFT" || existing.data.payments.length) return err("CONFLICT", "Редактировать можно только черновик без платежей");
    const validated = await getInput(tx, session, input); if (!validated.ok) return validated;
    const { input: data, amounts, customer } = validated.data;
    if (data.issueDate.slice(0, 4) !== existing.data.issueDate.toISOString().slice(0, 4)) return err("VALIDATION", "Год уже присвоенного номера менять нельзя");
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id, workspaceId: session.workspaceId } });
    const row = await tx.invoice.update({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version }, data: { contactId: data.contactId, currency: data.currency, issueDate: new Date(data.issueDate), dueDate: new Date(data.dueDate), notes: data.notes || null, subtotal: amounts.subtotal, taxRate: data.taxRate, total: amounts.total, customerSnapshot: customer, issuerName: session.workspaceName, version: { increment: 1 }, items: { create: itemData(data, amounts.lineTotals) } }, include: invoiceInclude });
    const invoice = toInvoice(row); await audit(tx, session, "updated", invoice, toInvoice(existing.data)); return ok(invoice);
  });
}
/** Send or cancel an eligible invoice; PAID is derived from registered payments. */
export async function updateInvoiceStatus(id: string, version: number, status: "SENT" | "CANCELLED"): Promise<Result<Invoice>> {
  return withMutation("update", async (tx, session) => {
    if (!["SENT", "CANCELLED"].includes(status)) return err("VALIDATION", "Недопустимый переход статуса");
    const existing = await getVersioned(tx, session, id, version); if (!existing.ok) return existing;
    const before = existing.data;
    if (status === "SENT" ? before.status !== "DRAFT" : !["DRAFT", "SENT", "OVERDUE", "PARTIALLY_PAID"].includes(before.status) || before.payments.length > 0) return err("CONFLICT", "Этот переход недоступен: проверьте статус и платежи");
    const row = await tx.invoice.update({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version }, data: { status, version: { increment: 1 } }, include: invoiceInclude });
    const invoice = toInvoice(row); await audit(tx, session, "updated", invoice, toInvoice(before)); return ok(invoice);
  });
}
/** Delete only an unpaid draft without reusing its allocated number. */
export async function deleteInvoice(id: string, version: number): Promise<Result<Invoice>> {
  return withMutation("delete", async (tx, session) => {
    const existing = await getVersioned(tx, session, id, version); if (!existing.ok) return existing;
    if (existing.data.status !== "DRAFT" || existing.data.payments.length) return err("CONFLICT", "Удалить можно только черновик без платежей");
    const invoice = toInvoice(existing.data); await tx.invoice.delete({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version } });
    await audit(tx, session, "deleted", invoice, invoice); return ok(invoice);
  });
}
/** Record an exact payment and derive PAID atomically; duplicates/overpayments fail. */
export async function createInvoicePayment(id: string, version: number, input: InvoicePaymentInput): Promise<Result<Invoice>> {
  return withMutation("update", async (tx, session) => {
    const parsed = invoicePaymentSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Проверьте сумму и реквизиты платежа");
    const existing = await getVersioned(tx, session, id, version); if (!existing.ok) return existing;
    if (!["SENT", "OVERDUE", "PARTIALLY_PAID"].includes(existing.data.status)) return err("CONFLICT", "Оплата доступна только для отправленного неоплаченного счёта");
    const before = toInvoice(existing.data), amount = BigInt(parsed.data.amount);
    if (amount > BigInt(before.balance)) return err("VALIDATION", "Платёж превышает остаток по счёту");
    await tx.payment.create({ data: { workspaceId: session.workspaceId, invoiceId: id, receivedById: session.userId, amount: parsed.data.amount, method: parsed.data.method, reference: parsed.data.reference, notes: parsed.data.notes || null } });
    const row = await tx.invoice.update({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version }, data: { status: amount === BigInt(before.balance) ? "PAID" : "SENT", version: { increment: 1 } }, include: invoiceInclude });
    const invoice = toInvoice(row); await audit(tx, session, "payment", invoice, before); return ok(invoice);
  });
}
