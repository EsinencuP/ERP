
import { useI18n } from "@/i18n/use-i18n";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "../types";

import { INVOICE_STATUS_LABELS } from "../presentation";
export { INVOICE_STATUS_LABELS, INVOICE_PAYMENT_METHOD_LABELS } from "../presentation";

const statusTones = { DRAFT: "subtle", SENT: "info", PAID: "success", OVERDUE: "warning", CANCELLED: "danger" } as const;
export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = { DRAFT: "hsl(var(--color-subtle))", SENT: "hsl(var(--color-info))", PAID: "hsl(var(--color-success))", OVERDUE: "hsl(var(--color-warning))", CANCELLED: "hsl(var(--color-danger))" };
/** Show a financial state with a text label and semantic token. */
export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) { return <Badge status={INVOICE_STATUS_LABELS[status]} style={{ color: INVOICE_STATUS_COLORS[status], background: status === "DRAFT" ? "hsl(var(--color-hover))" : `hsl(var(--color-${statusTones[status]}-soft))` }} />; }
/** Navigate normalized invoices/payments and the preserved legacy registry. */
export function FinanceNavigation({ legacy = false, section = legacy ? "legacy" : "invoices" }: { legacy?: boolean; section?: "dashboard" | "invoices" | "payments" | "expenses" | "reports" | "legacy" }) {
  const { t } = useI18n();

  return <nav aria-label={t("Разделы финансов")} className="motion-fade mb-6 flex w-fit max-w-full flex-wrap gap-1 rounded-xl border p-1 text-xs">{[
    { key: "dashboard", href: "/finance/dashboard", label: t("Обзор") },
    { key: "invoices", href: "/finance", label: t("Счета") },
    { key: "payments", href: "/finance/payments", label: t("Платежи") },
    { key: "expenses", href: "/finance/expenses", label: t("Расходы") },
    { key: "reports", href: "/finance/reports", label: t("P&L отчёт") },
    { key: "legacy", href: "/finance/documents", label: t("Прежний реестр") },
  ].map((item) => <Link key={item.key} href={item.href} aria-current={section === item.key ? "page" : undefined} className={`rounded-lg px-3 py-2 ${section === item.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>{t(item.label)}</Link>)}</nav>;
}
