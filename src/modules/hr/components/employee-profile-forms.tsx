"use client";
import { useI18n } from "@/i18n/use-i18n";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/feedback";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { createEmployeeDocumentLink, updateEmployeeDocumentLink, updateEmployeeLeaveAllowance } from "../actions";
import { employeeDocumentLinkSchema, leaveAllowanceSchema } from "../profile-schema";
import type { EmployeeDocumentLink, EmployeeDocumentLinkInput, LeaveAllowance, LeaveAllowanceInput } from "../types";

type Callbacks = { onSaved: () => void; onClose: (reload?: boolean) => void; onReturnFocus: () => void };

function ProfileSheet({ title, description, children, pending, blocked, error, onClose, onReturnFocus }: Callbacks & { title: string; description: string; children: ReactNode; pending: boolean; blocked: boolean; error: string }) {
  const { t } = useI18n();

  function handleClose() { if (!pending) onClose(blocked); }
  return <Sheet open modal={false} onOpenChange={function handleOpen(open) { if (!open) handleClose(); }}><SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg" closeDisabled={pending} onInteractOutside={function handleOutside(event) { event.preventDefault(); }} onEscapeKeyDown={function handleEscape(event) { if (pending) event.preventDefault(); }} onCloseAutoFocus={function handleFocus(event) { event.preventDefault(); onReturnFocus(); }}>
    <SheetHeader className="border-b p-6 text-left"><p className="eyebrow">{t("HR / Employee profile")}</p><SheetTitle>{t(title)}</SheetTitle><SheetDescription>{t(description)}</SheetDescription></SheetHeader>
    <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}{error && <p role="alert" className="mt-4 text-sm text-destructive">{t(error)}</p>}{blocked && <Button variant="outline" className="mt-4" onClick={function handleReload() { onClose(true); }}>{t("Закрыть и обновить")}</Button>}</div>
  </SheetContent></Sheet>;
}

function handleShortcut(event: KeyboardEvent<HTMLFormElement>) { if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.repeat && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.requestSubmit(); } }

/** Attach or edit a named document URL using its captured opening version. */
export function EmployeeDocumentForm({ employeeId, document: initial, ...callbacks }: Callbacks & { employeeId: string; document?: EmployeeDocumentLink }) {
  const { t } = useI18n();

  const document = useRef(initial).current, id = useId(), saving = useRef(false), [error, setError] = useState(""), [blocked, setBlocked] = useState(false);
  const form = useForm<EmployeeDocumentLinkInput>({ resolver: zodResolver(employeeDocumentLinkSchema), mode: "onBlur", reValidateMode: "onBlur", defaultValues: { title: document?.title ?? "", url: document?.url ?? "", notes: document?.notes ?? "" } });
  const pending = form.formState.isSubmitting;
  async function handleSubmit(input: EmployeeDocumentLinkInput) {
    if (saving.current || blocked) return; saving.current = true; setError("");
    try {
      const result = document ? await updateEmployeeDocumentLink(document.id, document.version, input) : await createEmployeeDocumentLink(employeeId, input);
      if (!result.ok) { setError(result.error.message); setBlocked(result.error.code !== "VALIDATION"); toast.error(t(result.error.message)); return; }
      toast.success(t(document ? t("Ссылка обновлена") : t("Документ добавлен"))); callbacks.onSaved();
    } catch { setError(t("Результат записи неизвестен. Обновите профиль перед повтором")); setBlocked(true); }
    finally { saving.current = false; }
  }
  return <ProfileSheet {...callbacks} title={document ? t("Редактировать документ") : t("Добавить документ")} description={t("Название и ссылка на файл в вашем хранилище.")} pending={pending} blocked={blocked} error={error}>
    <form noValidate onSubmit={form.handleSubmit(handleSubmit)} onKeyDown={handleShortcut} aria-busy={pending} className="space-y-6">
      <fieldset disabled={pending || blocked} className="space-y-4"><legend className="sr-only">{t("Ссылка на документ")}</legend>
        {([{ key: "title", label: t("Название *"), max: 200, type: "text" }, { key: "url", label: t("Ссылка на файл *"), max: 2048, type: "url" }] as const).map((field) => <div key={field.key}><label htmlFor={`${id}-${field.key}`} className="mb-2 block text-xs font-medium">{t(field.label)}</label><Input id={`${id}-${field.key}`} type={field.type} maxLength={field.max} {...form.register(field.key)} aria-required aria-invalid={Boolean(form.formState.errors[field.key])} aria-describedby={`${id}-${field.key}-error`} /><p id={`${id}-${field.key}-error`} className="mt-1 text-xs text-destructive" role={form.formState.errors[field.key] ? "alert" : undefined}>{t(form.formState.errors[field.key]?.message)}</p></div>)}
        <div><label htmlFor={`${id}-notes`} className="mb-2 block text-xs font-medium">{t("Примечание")}</label><textarea id={`${id}-notes`} className="input min-h-28 resize-y" maxLength={2000} {...form.register("notes")} aria-invalid={Boolean(form.formState.errors.notes)} aria-describedby={`${id}-notes-error`} /><p id={`${id}-notes-error`} className="text-xs text-destructive">{t(form.formState.errors.notes?.message)}</p></div>
      </fieldset>
      <p className="text-xs text-muted-foreground">{t("http(s)-ссылка откроется в новой вкладке. Доступ к файлу определяется вашим хранилищем.")}</p>
      <div className="flex flex-wrap justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={pending} onClick={function handleClose() { callbacks.onClose(blocked); }}>{t("Отмена")}</Button><Button type="submit" disabled={pending || blocked}>{pending && <Spinner />}{t("Сохранить документ")}</Button></div><p className="text-[11px] text-muted-foreground">{t("⌘ / Ctrl + Enter — сохранить · Esc — закрыть")}</p>
    </form>
  </ProfileSheet>;
}

/** Set an employee's explicit annual workday limit, keeping absent and zero limits distinct. */
export function EmployeeAllowanceForm({ employeeId, year, allowance: initial, ...callbacks }: Callbacks & { employeeId: string; year: number; allowance: LeaveAllowance | null }) {
  const { t } = useI18n();

  const allowance = useRef(initial).current, saving = useRef(false), id = useId(), [error, setError] = useState(""), [blocked, setBlocked] = useState(false);
  const form = useForm<LeaveAllowanceInput>({ resolver: zodResolver(leaveAllowanceSchema), mode: "onBlur", defaultValues: { year, days: allowance?.days ?? "" } });
  const pending = form.formState.isSubmitting;
  async function handleSubmit(input: LeaveAllowanceInput) {
    if (saving.current || blocked) return; saving.current = true; setError("");
    try {
      const result = await updateEmployeeLeaveAllowance(employeeId, allowance?.version ?? 0, input);
      if (!result.ok) { setError(result.error.message); setBlocked(result.error.code !== "VALIDATION"); toast.error(t(result.error.message)); return; }
      toast.success(t("Годовой лимит сохранён")); callbacks.onSaved();
    } catch { setError(t("Результат записи неизвестен. Обновите профиль перед повтором")); setBlocked(true); }
    finally { saving.current = false; }
  }
  return <ProfileSheet {...callbacks} title={t`Лимит отпуска · ${year}`} description={t("Годовой лимит ежегодного отпуска в рабочих днях.")} pending={pending} blocked={blocked} error={error}>
    <form noValidate onSubmit={form.handleSubmit(handleSubmit)} onKeyDown={handleShortcut} aria-busy={pending} className="space-y-6"><fieldset disabled={pending || blocked}><legend className="sr-only">{t("Годовой лимит")}</legend><label htmlFor={`${id}-days`} className="mb-2 block text-xs font-medium">{t("Рабочих дней *")}</label><Input id={`${id}-days`} inputMode="numeric" maxLength={4} {...form.register("days")} aria-required aria-invalid={Boolean(form.formState.errors.days)} aria-describedby={`${id}-days-error`} /><p id={`${id}-days-error`} className="mt-1 text-xs text-destructive" role={form.formState.errors.days ? "alert" : undefined}>{t(form.formState.errors.days?.message)}</p></fieldset><p className="text-xs leading-relaxed text-muted-foreground">{t("Укажите от 0 до 9999 дней. Остаток = лимит − одобренные дни в ")}{year} {t(" году, включая будущие отпуска. Ожидающие заявки показаны отдельно.")}</p><div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={pending} onClick={function handleClose() { callbacks.onClose(blocked); }}>{t("Отмена")}</Button><Button type="submit" disabled={pending || blocked}>{pending && <Spinner />}{t("Сохранить лимит")}</Button></div><p className="text-[11px] text-muted-foreground">{t("⌘ / Ctrl + Enter — сохранить · Esc — закрыть")}</p></form>
  </ProfileSheet>;
}
