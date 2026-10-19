"use server";
import { revalidatePath } from "next/cache";
import { createDocument, updateDocument, deleteDocument, getDocuments } from "@/lib/document-service";
import type { Result } from "@/types/shared";
import * as service from "./service";
import * as queries from "./queries";
import * as paymentQueries from "./payment-queries";
import * as analytics from "./analytics";
import * as expenseQueries from "./expense-queries";
import * as expenseService from "./expense-service";
import * as reports from "./reports";
import type { ExpenseFilters, ExpenseInput, FinanceCurrency, InvoiceFilters, InvoiceInput, InvoicePaymentInput, PaymentFilters, PnlFilters } from "./types";
function revalidateFinance<T>(result: Result<T>) { if (result.ok) { try { revalidatePath("/finance"); revalidatePath("/finance/[id]", "page"); revalidatePath("/finance/payments"); revalidatePath("/finance/expenses"); revalidatePath("/finance/reports"); revalidatePath("/"); } catch { console.error("Finance cache revalidation failed after commit"); } } return result; }
/** Read a validated period of normalized P&L with live workspace authorization. */
export async function getPnlReport(filters: PnlFilters) { return reports.getPnlReport(filters); }
/** Read normalized dashboard aggregates with fresh session/workspace authorization. */
export async function getFinanceDashboard(currency: FinanceCurrency = "RUB") { return analytics.getFinanceDashboard(currency); }
/** Export an authorized normalized financial overview as exact CSV cells. */
export async function getFinanceExport(currency: FinanceCurrency = "RUB") { return analytics.getFinanceExport(currency); }
/** Read the filtered normalized payment register. */
export async function getPayments(filters: PaymentFilters = {}) { return paymentQueries.getPayments(filters); }
/** Find authorized issued invoices for recording a payment. */
export async function getPayableInvoices(search = "") { return paymentQueries.getPayableInvoices(search); }
/** Read a category-filtered page of normalized workspace expenses. */
export async function getExpenses(filters: ExpenseFilters = {}) { return expenseQueries.getExpenses(filters); }
/** Read a single authorized expense. */
export async function getExpense(id: string) { return expenseQueries.getExpense(id); }
/** Create an expense with exact minor units and an audit event. */
export async function createExpense(input: ExpenseInput) { return revalidateFinance(await expenseService.createExpense(input)); }
/** Update an expense using its captured version. */
export async function updateExpense(id: string, version: number, input: ExpenseInput) { return revalidateFinance(await expenseService.updateExpense(id, version, input)); }
/** Delete a current-version expense with server-side canDelete. */
export async function deleteExpense(id: string, version: number) { return revalidateFinance(await expenseService.deleteExpense(id, version)); }
/** Read paginated normalized invoices. */
export async function getInvoices(filters: InvoiceFilters = {}) { return queries.getInvoices(filters); }
/** Read one normalized invoice. */
export async function getInvoice(id: string) { return queries.getInvoice(id); }
/** Create a numbered draft with authoritative calculated totals. */
export async function createInvoice(input: InvoiceInput) { return revalidateFinance(await service.createInvoice(input)); }
/** Edit an unpaid draft and its lines. */
export async function updateInvoice(id: string, version: number, input: InvoiceInput) { return revalidateFinance(await service.updateInvoice(id, version, input)); }
/** Send or cancel; SENT records issuance, not email delivery. */
export async function updateInvoiceStatus(id: string, version: number, status: "SENT" | "CANCELLED") { return revalidateFinance(await service.updateInvoiceStatus(id, version, status)); }
/** Delete an eligible draft without reusing its allocated number. */
export async function deleteInvoice(id: string, version: number) { return revalidateFinance(await service.deleteInvoice(id, version)); }
/** Record a payment and derive PAID when its balance is covered. */
export async function createInvoicePayment(id: string, version: number, input: InvoicePaymentInput) { return revalidateFinance(await service.createInvoicePayment(id, version, input)); }
/** Read the preserved legacy Document registry. */
export async function getInvoiceDocuments() { return getDocuments("finance"); }
/** Create a preserved legacy Document invoice. */
export async function createInvoiceDocument(input: unknown) { return createDocument("finance", input); }
/** Update a preserved legacy Document invoice. */
export async function updateInvoiceDocument(id: string, version: number, input: unknown) { return updateDocument("finance", id, version, input); }
/** Delete a preserved legacy Document invoice. */
export async function deleteInvoiceDocument(id: string, version: number) { return deleteDocument("finance", id, version); }
