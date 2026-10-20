"use client";
import { useI18n } from "@/i18n/use-i18n";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/feedback";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { createLeave } from "../actions";
import { getLeaveDays } from "../leave-days";
import { leaveSchema, leaveTypes } from "../leave-schema";
import type { LeaveInput } from "../types";
import { EmployeePicker } from "./employee-manager-picker";
import { LEAVE_TYPE_LABELS } from "./leave-presentation";

/** Submit an immutable leave application with immediate inclusive-weekday preview and authoritative server validation. */
export function LeaveFormSheet({ onSaved, onClose, onReturnFocus }: { onSaved: () => void; onClose: (reload?: boolean) => void; onReturnFocus: () => void }) {
  const { t } = useI18n();

  const id = useId(), saving = useRef(false), [selected, setSelected] = useState<{ id: string; name: string } | null>(null), [error, setError] = useState(""), [blocked, setBlocked] = useState(false);
  const form = useForm<LeaveInput>({ resolver: zodResolver(leaveSchema), mode: "onBlur", reValidateMode: "onBlur", defaultValues: { employeeId: "", type: "ANNUAL", startDate: "", endDate: "", reason: "" } }), pending = form.formState.isSubmitting;
  const start = form.watch("startDate"), end = form.watch("endDate"), days = getLeaveDays(start, end);
  async function handleSubmit(input: LeaveInput) { if (saving.current || blocked) return; saving.current = true; setError(""); try { const result = await createLeave(input); if (!result.ok) { setError(result.error.message); setBlocked(result.error.code !== "VALIDATION"); toast.error(t(result.error.message)); return; } toast.success(t("Заявка отправлена на согласование")); onSaved(); } catch { const message = t("Результат отправки неизвестен. Закройте форму и обновите список перед повтором"); setError(message); setBlocked(true); toast.error(t(message)); } finally { saving.current = false; } }
  function handleClose() { if (!saving.current && !pending) onClose(blocked); }
  function handleShortcut(event: KeyboardEvent<HTMLFormElement>) { if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); if (!event.repeat && !pending && !blocked && !saving.current) event.currentTarget.requestSubmit(); } }
  return <Sheet open modal={false} onOpenChange={function handleOpen(open) { if (!open) handleClose(); }}><SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl" closeDisabled={pending} onInteractOutside={function handleOutside(event) { event.preventDefault(); }} onEscapeKeyDown={function handleEscape(event) { if (pending || saving.current) event.preventDefault(); }} onCloseAutoFocus={function handleReturn(event) { event.preventDefault(); onReturnFocus(); }}>
    <SheetHeader className="border-b p-6 text-left"><p className="eyebrow">{t("HR / Leave request")}</p><SheetTitle>{t("Новая заявка на отпуск")}</SheetTitle><SheetDescription>{t("После отправки заявку рассмотрит менеджер или администратор.")}</SheetDescription></SheetHeader>
    <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={form.handleSubmit(handleSubmit)} onKeyDown={handleShortcut} aria-busy={pending}><div className="min-h-0 flex-1 overflow-y-auto p-6"><fieldset disabled={pending || blocked} className="space-y-5"><legend className="sr-only">{t("Заявка на отпуск")}</legend>
      <EmployeePicker label={t("Сотрудник")} emptyLabel={t("Выберите сотрудника")} eligibleOnly selected={selected} disabled={pending || blocked} onSelect={function handleEmployee(employee) { setSelected(employee); form.setValue("employeeId", employee?.id ?? "", { shouldDirty: true, shouldValidate: true }); }} /><p role={form.formState.errors.employeeId ? "alert" : undefined} className="text-xs text-destructive">{form.formState.errors.employeeId ? t("Выберите сотрудника") : ""}</p>
      <div><label htmlFor={`${id}-type`} className="mb-2 block text-xs font-medium">{t("Тип отпуска")}</label><select id={`${id}-type`} className="input" {...form.register("type")}>{leaveTypes.map((type) => <option key={type} value={type}>{t(LEAVE_TYPE_LABELS[type])}</option>)}</select><p className="mt-1 text-xs text-destructive">{t(form.formState.errors.type?.message)}</p></div>
      <div className="grid gap-4 sm:grid-cols-2">{([{ key: "startDate", label: t("Дата начала *") }, { key: "endDate", label: t("Дата окончания *") }] as const).map((field) => <div key={field.key}><label htmlFor={`${id}-${field.key}`} className="mb-2 block text-xs font-medium">{t(field.label)}</label><Input id={`${id}-${field.key}`} type="date" aria-required aria-invalid={Boolean(form.formState.errors[field.key])} aria-describedby={`${id}-${field.key}-error`} {...form.register(field.key)} /><p id={`${id}-${field.key}-error`} role={form.formState.errors[field.key] ? "alert" : undefined} className="mt-1 text-xs text-destructive">{t(form.formState.errors[field.key]?.message)}</p></div>)}</div>
      <div className="rounded-xl border bg-primary/5 p-4" aria-live="polite"><p className="text-xs text-muted-foreground">{t("Рабочих дней")}</p><p data-leave-days className="mt-2 font-mono text-2xl font-semibold">{days.ok ? days.data : "—"}</p><p className="mt-2 text-xs text-muted-foreground">{t("Обе даты включены. Суббота и воскресенье исключены; праздники не учитываются.")}</p>{start && end && !days.ok && <p className="mt-2 text-xs text-destructive">{t(days.error.message)}</p>}</div>
      <div><label htmlFor={`${id}-reason`} className="mb-2 block text-xs font-medium">{t("Причина")}</label><Textarea id={`${id}-reason`} rows={4} maxLength={2000} {...form.register("reason")} /><p className="mt-1 text-xs text-destructive">{t(form.formState.errors.reason?.message)}</p></div>
    </fieldset>{error && <p role="alert" className="mt-5 text-xs text-destructive">{t(error)}</p>}{blocked && <Button type="button" variant="outline" className="mt-4" onClick={function handleReload() { onClose(true); }}>{t("Закрыть и обновить")}</Button>}</div><footer className="border-t px-6 py-4"><p className="mb-4 text-[11px] text-muted-foreground">{t("⌘ / Ctrl + Enter — отправить · Esc — закрыть")}</p><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={handleClose}>{t("Отмена")}</Button><Button type="submit" disabled={pending || blocked}>{pending && <Spinner />}{t("Отправить заявку")}</Button></div></footer></form>
  </SheetContent></Sheet>;
}
