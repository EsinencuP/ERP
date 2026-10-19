import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "../types";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = { DRAFT: "Черновик", SENT: "Отправлен", PAID: "Оплачен", OVERDUE: "Просрочен", CANCELLED: "Отменён" };
export const INVOICE_PAYMENT_METHOD_LABELS: Readonly<Record<string, string>> = { BANK_TRANSFER: "Банковский перевод", CARD: "Карта", CASH: "Наличные", OTHER: "Другой" };
const statusTones = { DRAFT: "subtle", SENT: "info", PAID: "success", OVERDUE: "warning", CANCELLED: "danger" } as const;
export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = { DRAFT: "hsl(var(--color-subtle))", SENT: "hsl(var(--color-info))", PAID: "hsl(var(--color-success))", OVERDUE: "hsl(var(--color-warning))", CANCELLED: "hsl(var(--color-danger))" };
/** Show a financial state with a text label and semantic token. */
export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) { return <Badge status={INVOICE_STATUS_LABELS[status]} style={{ color: INVOICE_STATUS_COLORS[status], background: status === "DRAFT" ? "hsl(var(--color-hover))" : `hsl(var(--color-${statusTones[status]}-soft))` }} />; }
/** Navigate normalized invoices/payments and the preserved legacy registry. */
export function FinanceNavigation({ legacy = false, section = legacy ? "legacy" : "invoices" }: { legacy?: boolean; section?: "invoices" | "payments" | "expenses" | "reports" | "legacy" }) {
  return <nav aria-label="Разделы финансов" className="motion-fade mb-6 flex w-fit max-w-full flex-wrap gap-1 rounded-xl border p-1 text-xs">{[
    { key: "invoices", href: "/finance", label: "Счета" },
    { key: "payments", href: "/finance/payments", label: "Платежи" },
    { key: "expenses", href: "/finance/expenses", label: "Расходы" },
    { key: "reports", href: "/finance/reports", label: "P&L отчёт" },
    { key: "legacy", href: "/finance/documents", label: "Прежний реестр" },
  ].map((item) => <Link key={item.key} href={item.href} aria-current={section === item.key ? "page" : undefined} className={`rounded-lg px-3 py-2 ${section === item.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>{item.label}</Link>)}</nav>;
}
