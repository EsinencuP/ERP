"use client";
import { useAppFormat } from "@/modules/settings/configuration-provider";
import { useI18n } from "@/i18n/use-i18n";


import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/feedback";
import { createPayment } from "@/modules/finance/payments";
import { money } from "@/lib/utils";
import type { DocumentRecord, Payment } from "@/types/shared";

const schema = z.object({ amount: z.number({ invalid_type_error: "Введите сумму" }).positive("Сумма должна быть больше нуля").max(20_000_000, "Не более 20 млн € за один платёж") });

/** Register an invoice receipt with a stable per-submission idempotency reference. */
export function PaymentForm({ invoice, payments, onClose, onSaved }: { invoice: DocumentRecord; payments: Payment[]; onClose: () => void; onSaved: (record: DocumentRecord) => void }) {
  const { t , locale: uiLocale, localeTag: uiLocaleTag } = useI18n();
  const { formatDate } = useAppFormat();

  const receipts = payments.filter((row) => row.documentId === invoice.id);
  const paid = receipts.reduce((sum, row) => sum + row.amount, 0);
  const remaining = invoice.data.amount - paid;
  const [reference] = useState(() => crypto.randomUUID());
  const [error, setError] = useState("");
  const form = useForm<{ amount: number }>({ resolver: zodResolver(schema), defaultValues: { amount: remaining / 100 } });
  async function handleSubmit(data: { amount: number }) {
    setError("");
    try { const result = await createPayment({ documentId: invoice.id, version: invoice.version, reference, amount: Math.round(data.amount * 100) }); if (!result.ok) { setError(result.error.message); return; } onSaved(result.data); onClose(); }
    catch { setError(t("Связь с сервером прервана. Обновите страницу и проверьте поступления перед повтором")); }
  }
  return <Dialog open onOpenChange={function handleOpenChange(open) { if (!open && !form.formState.isSubmitting) onClose(); }}><DialogContent><DialogTitle className="text-lg font-medium">{t("Зарегистрировать оплату")}</DialogTitle><DialogDescription className="mb-5 mt-2 text-xs muted">{invoice.data.title} · {invoice.data.subtitle}</DialogDescription><div className="mb-5 grid grid-cols-2 gap-3 rounded-xl border bg-[hsl(var(--color-background))] p-4"><div><p className="text-[10px] muted">{t("Уже поступило")}</p><p className="mt-2 font-mono text-sm">{money(paid, undefined, uiLocale)}</p></div><div><p className="text-[10px] muted">{t("Осталось оплатить")}</p><p className="mt-2 font-mono text-sm text-[hsl(var(--color-primary))]">{money(remaining, undefined, uiLocale)}</p></div></div><form onSubmit={form.handleSubmit(handleSubmit)} noValidate><label htmlFor="payment-amount" className="field-label">{t("Сумма поступления, €")}</label><Input id="payment-amount" type="number" step="0.01" min="0.01" {...form.register("amount", { valueAsNumber: true })} aria-invalid={Boolean(form.formState.errors.amount)} aria-describedby="payment-error" /><p id="payment-error" className="mt-2 text-xs text-[hsl(var(--color-danger))]">{t(form.formState.errors.amount?.message)}</p>{error && <p role="alert" className="mt-4 text-xs text-[hsl(var(--color-danger))]">{t(error)}</p>}<div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} disabled={form.formState.isSubmitting}>{t("Отмена")}</Button><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Spinner /> : <CreditCard />}{t("Зарегистрировать")}</Button></div></form>{receipts.length > 0 && <div className="mt-6 border-t pt-4"><p className="eyebrow mb-3">{t("История поступлений")}</p>{receipts.map((row) => <div key={row.id} className="flex justify-between py-1.5 text-[10px]"><span className="muted">{formatDate(row.createdAt)}</span><span className="font-mono">{money(row.amount, undefined, uiLocale)}</span></div>)}</div>}</DialogContent></Dialog>;
}
