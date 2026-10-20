import type { ExpenseCategory, InvoiceStatus } from "./types";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = { DRAFT: "Черновик", SENT: "Отправлен", PAID: "Оплачен", OVERDUE: "Просрочен", CANCELLED: "Отменён" };
export const INVOICE_PAYMENT_METHOD_LABELS: Readonly<Record<string, string>> = { BANK_TRANSFER: "Банковский перевод", CARD: "Карта", CASH: "Наличные", OTHER: "Другой" };
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  OFFICE: "Офис", SOFTWARE: "ПО и подписки", TRAVEL: "Командировки", MARKETING: "Маркетинг",
  EQUIPMENT: "Оборудование", RENT: "Аренда", UTILITIES: "Коммунальные услуги", OTHER: "Прочее",
};
