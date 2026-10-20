import { z } from "zod";
import { baseRecordSchema } from "@/lib/record-schema";
import { definition } from "./config";

export const schema = baseRecordSchema.extend({ status: z.enum(definition.statuses), subtitle: z.string().trim().min(1, "Заполните поле").max(160), amount: z.number().int().positive("Сумма должна быть больше нуля"), date: baseRecordSchema.shape.date.refine((value) => value.length > 0, "Укажите срок оплаты") });

export const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"] as const;
export const FINANCE_CURRENCIES = ["RUB", "USD", "EUR"] as const;
export const PAYMENT_METHODS = ["BANK_TRANSFER", "CARD", "CASH", "OTHER"] as const;
const identifierSchema = z.string().trim().max(128);
export const financeRecordIdSchema = identifierSchema.min(1, "Укажите идентификатор");
export const financeVersionSchema = z.number().int().positive().max(2_147_483_646);
export const invoiceIdSchema = financeRecordIdSchema;
export const invoiceVersionSchema = financeVersionSchema;
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дату").refine((value) => { const date = new Date(value); return value.slice(0, 4) !== "0000" && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value; }, "Несуществующая дата");
export const invoiceItemSchema = z.object({ description: z.string().trim().min(1, "Введите описание").max(1000), quantity: z.string().regex(/^\d{1,17}(\.\d{1,3})?$/, "Количество: до 3 знаков после точки").refine((value) => /[1-9]/.test(value), "Количество должно быть больше нуля"), unitPrice: z.string().regex(/^\d{1,20}$/, "Цена в целых копейках, до 20 цифр") }).strict();
export const invoiceSchema = z.object({ contactId: identifierSchema.min(1, "Выберите клиента из CRM"), currency: z.enum(["RUB", "USD", "EUR"]).default("RUB"), issueDate: dateSchema, dueDate: dateSchema, taxRate: z.string().regex(/^\d{1,3}(\.\d{1,2})?$/, "Налог: до 2 знаков после точки").refine((value) => Number(value) <= 100, "Налог от 0 до 100%"), notes: z.string().trim().max(10000).default(""), items: z.array(invoiceItemSchema).min(1, "Добавьте строку счёта").max(100, "Не более 100 строк") }).strict().refine((value) => value.dueDate >= value.issueDate, { path: ["dueDate"], message: "Срок оплаты не раньше даты счёта" });
export const invoiceCustomerSchema = z.object({ name: z.string(), company: z.string().nullable(), email: z.string().nullable(), address: z.string().nullable() });
const majorAmountPattern = /^\d{1,18}(\.\d{1,2})?$/;
export const invoiceMajorPriceSchema = z.string().regex(majorAmountPattern, "Цена: до 2 знаков после точки");
export const invoiceFormSchema = invoiceSchema.innerType().extend({ items: z.array(invoiceItemSchema.extend({ unitPrice: invoiceMajorPriceSchema })).min(1, "Добавьте строку").max(100) }).refine((value) => value.dueDate >= value.issueDate, { path: ["dueDate"], message: "Срок оплаты не раньше даты счёта" });
export const invoiceFiltersSchema = z.object({ page: z.number().int().min(1).max(1000000).default(1), pageSize: z.number().int().min(1).max(100).default(20), search: z.string().trim().max(200).default(""), status: z.enum(INVOICE_STATUSES).optional() }).strict();
export const invoicePaymentSchema = z.object({ amount: z.string().regex(/^\d{1,20}$/).refine((value) => /^\d{1,20}$/.test(value) && BigInt(value) > 0n, "Сумма должна быть больше нуля"), method: z.enum(["BANK_TRANSFER", "CARD", "CASH", "OTHER"]).default("BANK_TRANSFER"), reference: z.string().trim().min(1).max(128), notes: z.string().trim().max(1000).default("") }).strict();
export const financeCurrencySchema = z.enum(FINANCE_CURRENCIES);
export const pnlFiltersSchema = z.object({ from: dateSchema, to: dateSchema, currency: financeCurrencySchema.default("RUB") }).strict().refine((value) => value.from <= value.to, { path: ["to"], message: "Конец периода не раньше начала" });
export const pnlExportSchema = z.object({ type: z.literal("pnl"), from: dateSchema, to: dateSchema, currency: financeCurrencySchema.default("RUB") }).strict().refine((value) => value.from <= value.to, { path: ["to"], message: "Конец периода не раньше начала" });
export const paymentFiltersSchema = z.object({
  page: z.number().int().min(1).max(1000000).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).default(""),
  currency: financeCurrencySchema.optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
}).strict().refine((value) => !value.from || !value.to || value.from <= value.to, { path: ["to"], message: "Конец периода не раньше начала" });

export const EXPENSE_CATEGORIES = ["OFFICE", "SOFTWARE", "TRAVEL", "MARKETING", "EQUIPMENT", "RENT", "UTILITIES", "OTHER"] as const;
export const expenseCategorySchema = z.enum(EXPENSE_CATEGORIES);
function isReceiptUrl(value: string): boolean {
  if (!value) return true;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password && url.href.length <= 2048; }
  catch { return false; }
}
const expenseReceiptSchema = z.string().trim().max(2048, "Ссылка — до 2048 символов").refine(isReceiptUrl, "Укажите ссылку http(s) без логина и пароля").transform((value) => value ? new URL(value).href : "");
export const expenseSchema = z.object({
  projectId: identifierSchema.optional(),
  title: z.string().trim().min(1, "Введите название расхода").max(200, "Не более 200 символов"),
  amount: invoicePaymentSchema.shape.amount,
  currency: financeCurrencySchema.default("RUB"),
  category: expenseCategorySchema.default("OTHER"),
  date: dateSchema,
  receipt: expenseReceiptSchema.default(""),
  notes: z.string().trim().max(10000, "Комментарий — до 10000 символов").default(""),
}).strict();
export const expenseFormSchema = expenseSchema.extend({ amount: z.string().regex(majorAmountPattern, "Сумма: до 2 знаков после точки").refine((value) => /[1-9]/.test(value), "Сумма должна быть больше нуля") });
export const expenseFiltersSchema = z.object({
  page: z.number().int().min(1).max(1000000).default(1), pageSize: z.number().int().min(1).max(100).default(20),
  projectId: financeRecordIdSchema.optional(),
  search: z.string().trim().max(200).default(""), category: expenseCategorySchema.optional(), currency: financeCurrencySchema.optional(),
}).strict();

/** Revalidate stored receipt references before rendering a user-activated external link. */
export function getExpenseReceiptUrl(value: string | null): string | null {
  const result = expenseReceiptSchema.safeParse(value ?? "");
  return result.success && result.data ? result.data : null;
}
