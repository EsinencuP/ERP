"use client";
import { useAppFormat } from "@/modules/settings/configuration-provider";
import { useI18n } from "@/i18n/use-i18n";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RecordPicker } from "@/components/ui/record-picker";
import { getTaskProject, getTaskProjects } from "@/modules/projects/actions";
import type { TaskProject } from "@/modules/projects/task-types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/feedback";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { createExpense, updateExpense } from "../actions";
import { invoicePriceInput, parseInvoicePrice } from "../calculations";
import { EXPENSE_CATEGORIES, FINANCE_CURRENCIES, expenseFormSchema } from "../schema";
import type { Expense } from "../types";
import { EXPENSE_CATEGORY_LABELS } from "./expense-presentation";

type FormValues = z.input<typeof expenseFormSchema>;

/** Create/edit an expense in a shared non-modal Sheet, keeping the opening version immutable. */
export function ExpenseFormSheet({ expense: initialExpense, initialProjectId = "", onSaved, onClose, onReload, onReturnFocus }: { expense?: Expense; initialProjectId?: string; onSaved: (expense: Expense) => void; onClose: (needsReload?: boolean) => void; onReload: () => void; onReturnFocus: () => void }) {
  const { t } = useI18n();
  const { today } = useAppFormat();

  const expense = useRef(initialExpense).current, id = useId(), saving = useRef(false);
  const selectedProjectId = expense?.projectId ?? initialProjectId, projectSelection = useRef(0);
  const [project, setProject] = useState<TaskProject | null>(selectedProjectId ? { id: selectedProjectId, code: "", name: t("Связанный проект") } : null), [projectError, setProjectError] = useState("");
  useEffect(() => { if (!selectedProjectId) return; let alive = true; const selection = projectSelection.current; getTaskProject(selectedProjectId).then((result) => { if (!alive || selection !== projectSelection.current) return; if (result.ok) setProject(result.data); else setProjectError(result.error.message); }).catch(() => { if (alive && selection === projectSelection.current) setProjectError(t("Не удалось прочитать название проекта; назначение сохранено")); }); return () => { alive = false; }; }, [selectedProjectId]);
  const [error, setError] = useState(""), [blocked, setBlocked] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(expenseFormSchema), mode: "onBlur", reValidateMode: "onBlur", defaultValues: { projectId: selectedProjectId, title: expense?.title ?? "", amount: expense ? invoicePriceInput(expense.amount) : "", currency: "EUR", category: expense?.category ?? "OTHER", date: expense?.date ?? today(), receipt: expense?.receipt ?? "", notes: expense?.notes ?? "" } });
  const pending = form.formState.isSubmitting, locked = pending || blocked;
  async function handleSubmit(input: FormValues) {
    if (saving.current || blocked) return;
    const amount = parseInvoicePrice(input.amount); if (!amount.ok) { form.setError("amount", { message: amount.error.message }); return; }
    saving.current = true; setError("");
    try {
      const payload = { ...input, amount: amount.data };
      const result = expense ? await updateExpense(expense.id, expense.version, payload) : await createExpense(payload);
      if (!result.ok) { setError(result.error.message); setBlocked(result.error.code !== "VALIDATION"); toast.error(t(result.error.message)); return; }
      toast.success(t(expense ? t("Расход обновлён") : t("Расход добавлен"))); onSaved(result.data);
    } catch { const message = t("Результат записи неизвестен. Закройте форму, обновите расходы и проверьте запись перед повтором"); setError(message); setBlocked(true); toast.error(t(message)); }
    finally { saving.current = false; }
  }
  function handleClose() { if (!saving.current && !pending) onClose(blocked); }
  function handleShortcut(event: KeyboardEvent<HTMLFormElement>) { if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); if (!event.repeat && !locked && !saving.current) event.currentTarget.requestSubmit(); } }
  const fieldError = (key: keyof FormValues) => form.formState.errors[key]?.message;
  return <Sheet open modal={false} onOpenChange={function handleOpen(open) { if (!open) handleClose(); }}><SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg" closeDisabled={pending} onInteractOutside={function handleOutside(event) { event.preventDefault(); }} onEscapeKeyDown={function handleEscape(event) { if (pending || saving.current) event.preventDefault(); }} onOpenAutoFocus={function handleFocus(event) { event.preventDefault(); form.setFocus("title"); }} onCloseAutoFocus={function handleReturn(event) { event.preventDefault(); onReturnFocus(); }}>
    <SheetHeader className="border-b p-6 text-left"><p className="eyebrow text-muted-foreground">{t("Finance / Expenses")}</p><SheetTitle className="pr-7">{expense ? t("Редактировать расход") : t("Новый расход")}</SheetTitle><SheetDescription>{t("Укажите сумму, категорию и дату. Ссылку на чек и комментарий можно добавить позже.")}</SheetDescription></SheetHeader>
    <form onSubmit={form.handleSubmit(handleSubmit, function handleInvalid() { toast.error(t("Проверьте поля расхода")); })} onKeyDown={handleShortcut} className="flex min-h-0 flex-1 flex-col" noValidate aria-busy={pending}>
      <div className="relative min-h-0 flex-1 overflow-y-auto p-6"><fieldset disabled={locked} className="grid gap-5 sm:grid-cols-2"><legend className="sr-only">{t("Данные расхода")}</legend>
        <div className="sm:col-span-2"><label htmlFor={`${id}-title`} className="mb-2 block text-xs font-medium">{t("Название *")}</label><Input id={`${id}-title`} maxLength={200} {...form.register("title")} aria-required aria-invalid={Boolean(fieldError("title"))} aria-describedby={`${id}-title-error`} /><p role={fieldError("title") ? "alert" : undefined} id={`${id}-title-error`} className="mt-1 text-xs text-destructive">{t(fieldError("title"))}</p></div>
        <div><label htmlFor={`${id}-amount`} className="mb-2 block text-xs font-medium">{t("Сумма *")}</label><Input id={`${id}-amount`} inputMode="decimal" maxLength={21} {...form.register("amount", { setValueAs: (value: string) => value.trim().replace(",", ".") })} aria-required aria-invalid={Boolean(fieldError("amount"))} aria-describedby={`${id}-amount-error`} placeholder="0.00" /><p role={fieldError("amount") ? "alert" : undefined} id={`${id}-amount-error`} className="mt-1 text-xs text-destructive">{t(fieldError("amount"))}</p></div>
        <div><label htmlFor={`${id}-currency`} className="mb-2 block text-xs font-medium">{t("Валюта *")}</label><select id={`${id}-currency`} className="input w-full" {...form.register("currency")}>{FINANCE_CURRENCIES.map((code) => <option key={code}>{code}</option>)}</select></div>
        <div><label htmlFor={`${id}-category`} className="mb-2 block text-xs font-medium">{t("Категория *")}</label><select id={`${id}-category`} className="input w-full" {...form.register("category")}>{EXPENSE_CATEGORIES.map((value) => <option key={value} value={value}>{t(EXPENSE_CATEGORY_LABELS[value])}</option>)}</select></div>
        <div className="min-w-0"><label htmlFor={`${id}-date`} className="mb-2 block text-xs font-medium">{t("Дата *")}</label><Input id={`${id}-date`} type="date" min="0001-01-01" max="9999-12-31" {...form.register("date")} aria-required aria-invalid={Boolean(fieldError("date"))} aria-describedby={`${id}-date-error`} /><p role={fieldError("date") ? "alert" : undefined} id={`${id}-date-error`} className="mt-1 text-xs text-destructive">{t(fieldError("date"))}</p></div>
        <div className="sm:col-span-2"><RecordPicker label={t("Проект расхода")} selected={project} load={getTaskProjects} disabled={locked} emptyLabel={t("Без проекта")} onSelect={function handleProject(value) { projectSelection.current += 1; setProject(value); setProjectError(""); form.setValue("projectId", value?.id ?? "", { shouldDirty: true, shouldValidate: true }); }} />{projectError && <p role="status" className="mt-2 text-xs text-warning">{t(projectError)}</p>}</div>
        <div className="sm:col-span-2"><label htmlFor={`${id}-receipt`} className="mb-2 block text-xs font-medium">{t("Ссылка на чек")}</label><Input id={`${id}-receipt`} type="url" maxLength={2048} {...form.register("receipt")} aria-invalid={Boolean(fieldError("receipt"))} aria-describedby={`${id}-receipt-error ${id}-receipt-help`} placeholder="https://…" /><p role={fieldError("receipt") ? "alert" : undefined} id={`${id}-receipt-error`} className="mt-1 text-xs text-destructive">{t(fieldError("receipt"))}</p><p id={`${id}-receipt-help`} className="mt-2 text-xs text-muted-foreground">{t("Ссылка http(s) на подтверждающий документ.")}</p></div>
        <div className="sm:col-span-2"><label htmlFor={`${id}-notes`} className="mb-2 block text-xs font-medium">{t("Комментарий")}</label><Textarea id={`${id}-notes`} rows={4} maxLength={10000} {...form.register("notes")} aria-invalid={Boolean(fieldError("notes"))} aria-describedby={`${id}-notes-error`} /><p role={fieldError("notes") ? "alert" : undefined} id={`${id}-notes-error`} className="mt-1 text-xs text-destructive">{t(fieldError("notes"))}</p></div>
      </fieldset>{error && <p role="alert" className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{t(error)}{blocked && t(" Перед следующей записью перечитайте данные.")}</p>}{blocked && <Button type="button" variant="outline" className="mt-3" disabled={pending} onClick={function handleReload() { onClose(); onReload(); }}>{t("Закрыть и обновить")}</Button>}</div>
      <footer className="border-t px-6 py-4"><p className="mb-4 text-[11px] text-muted-foreground">{t("⌘ / Ctrl + Enter — сохранить · Esc — закрыть")}</p><div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={handleClose}>{t("Отмена")}</Button><Button type="submit" disabled={locked}>{pending && <Spinner />}{pending ? t("Сохранение…") : t("Сохранить расход")}</Button></div></footer>
    </form>
  </SheetContent></Sheet>;
}
