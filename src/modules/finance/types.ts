import type { z } from "zod";
import type { schema } from "./schema";
import type { DocumentRecord } from "@/types/shared";

export type InvoiceData = z.infer<typeof schema>;
export type InvoiceDocument = Omit<DocumentRecord, "domain" | "data"> & { domain: "finance"; data: InvoiceData };

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
export type InvoiceCustomer = { name: string; company: string | null; email: string | null; address: string | null };
export type InvoiceItem = { id: string; description: string; quantity: string; unitPrice: string; total: string; position: number };
export type InvoicePayment = { id: string; amount: string; method: string; reference: string; receivedAt: string; notes: string | null };
export type Invoice = { id: string; number: string; workspaceId: string; contactId: string; status: InvoiceStatus; storedStatus: string; currency: string; subtotal: string; taxRate: string; taxAmount: string; total: string; paid: string; balance: string; issueDate: string; dueDate: string; notes: string | null; version: number; createdAt: string; updatedAt: string; customer: InvoiceCustomer; issuerName: string; items: InvoiceItem[]; payments: InvoicePayment[] };
export type InvoiceInput = z.input<typeof import("./schema").invoiceSchema>;
export type InvoiceFilters = z.input<typeof import("./schema").invoiceFiltersSchema>;
export type InvoicePaymentInput = z.input<typeof import("./schema").invoicePaymentSchema>;

export type FinanceCurrency = z.infer<typeof import("./schema").financeCurrencySchema>;
export type PnlFilters = z.input<typeof import("./schema").pnlFiltersSchema>;
export type PnlReport = { from: string; to: string; currency: FinanceCurrency; asOf: string; revenue: string; expenses: string; netProfit: string; invoiceCount: number; expenseCount: number; categories: { category: ExpenseCategory; amount: string; count: number }[] };
export type PaymentFilters = z.input<typeof import("./schema").paymentFiltersSchema>;
export type PaymentRow = InvoicePayment & { invoiceId: string; invoiceNumber: string; currency: string; customerName: string; receivedBy: string | null };
export type ExpenseCategory = z.infer<typeof import("./schema").expenseCategorySchema>;
export type ExpenseInput = z.input<typeof import("./schema").expenseSchema>;
export type ExpenseFilters = z.input<typeof import("./schema").expenseFiltersSchema>;
export type Expense = { id: string; projectId: string | null; workspaceId: string; createdById: string | null; title: string; amount: string; currency: string; category: ExpenseCategory; date: string; receipt: string | null; notes: string | null; version: number; createdAt: string; updatedAt: string };
export type FinanceDashboardData = {
  currency: FinanceCurrency;
  asOf: string;
  kpis: { totalRevenue: string; outstanding: string; paidMtd: string; overdue: string; openCount: number; overdueCount: number };
  revenue: { month: string; amount: string }[];
  statuses: { status: InvoiceStatus; count: number }[];
  topClients: { id: string; name: string; amount: string }[];
  aging: { bucket: number; amount: string; count: number }[];
  recentInvoices: { id: string; number: string; customerName: string; status: InvoiceStatus; dueDate: string; total: string; balance: string }[];
};
