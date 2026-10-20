"use client";
import { useI18n } from "@/i18n/use-i18n";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import type { Expense } from "../types";
import { EXPENSE_CATEGORY_LABELS, ExpenseReceiptLink } from "./expense-presentation";

/** Read every expense field, including full notes, without requiring edit permissions. */
export function ExpenseDetailDialog({ expense, onClose }: { expense: Expense; onClose: () => void }) {
  const { t , locale: uiLocale } = useI18n();

  return <Dialog open onOpenChange={function handleOpen(open) { if (!open) onClose(); }}><DialogContent className="motion-fade max-h-[90dvh] max-w-xl overflow-y-auto"><DialogTitle className="break-words pr-7">{expense.title}</DialogTitle><DialogDescription className="mt-2 text-xs text-muted-foreground">{t("Детали расхода")}</DialogDescription><dl className="mt-6 grid gap-5 sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">{t("Сумма")}</dt><dd className="mt-2 break-words font-mono text-lg font-semibold">{formatCurrency(expense.amount, expense.currency, uiLocale)}</dd></div><div><dt className="text-xs text-muted-foreground">{t("Категория")}</dt><dd className="mt-2 text-sm">{t(EXPENSE_CATEGORY_LABELS[expense.category])}</dd></div><div><dt className="text-xs text-muted-foreground">{t("Дата")}</dt><dd className="mt-2 font-mono text-sm">{expense.date}</dd></div><div><dt className="text-xs text-muted-foreground">{t("Чек")}</dt><dd className="mt-2"><ExpenseReceiptLink receipt={expense.receipt} /></dd></div><div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">{t("Комментарий")}</dt><dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{expense.notes || "—"}</dd></div></dl></DialogContent></Dialog>;
}
