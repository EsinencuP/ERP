"use client";
import { useI18n } from "@/i18n/use-i18n";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/feedback";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { createEmployee, updateEmployee } from "../actions";
import { employeeSchema, employeeStatuses } from "../schema";
import type { Employee, EmployeeInput } from "../types";
import { EmployeeManagerPicker } from "./employee-manager-picker";
import { EMPLOYEE_STATUS_LABELS } from "./employee-presentation";

/** Create or edit a captured profile version through the shared non-modal Sheet form. */
export function EmployeeFormSheet({ employee: initial, onSaved, onClose, onReload, onReturnFocus }: { employee?: Employee; onSaved: () => void; onClose: (needsReload?: boolean) => void; onReload: () => void; onReturnFocus: () => void }) {
  const { t } = useI18n();

  const employee = useRef(initial).current, id = useId(), saving = useRef(false), [error, setError] = useState(""), [blocked, setBlocked] = useState(false), [manager, setManager] = useState(employee?.manager ?? null);
  const form = useForm<EmployeeInput>({ resolver: zodResolver(employeeSchema), mode: "onBlur", reValidateMode: "onBlur", defaultValues: { employeeId: employee?.employeeId ?? "", name: employee?.name ?? "", email: employee?.email ?? "", phone: employee?.phone ?? "", position: employee?.position ?? "", department: employee?.department ?? "", hireDate: employee?.hireDate ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()), status: employee?.status ?? "ACTIVE", managerId: employee?.managerId ?? "" } });
  const pending = form.formState.isSubmitting;
  async function handleSubmit(input: EmployeeInput) {
    if (saving.current || blocked) return; saving.current = true; setError("");
    try { const result = employee ? await updateEmployee(employee.id, employee.version, input) : await createEmployee(input); if (!result.ok) { setError(result.error.message); setBlocked(result.error.code !== "VALIDATION"); toast.error(t(result.error.message)); return; } toast.success(t(employee ? t("Профиль обновлён") : t("Сотрудник добавлен"))); onSaved(); }
    catch { const message = t("Результат записи неизвестен. Закройте форму и обновите каталог перед повтором"); setError(message); setBlocked(true); toast.error(t(message)); }
    finally { saving.current = false; }
  }
  function handleClose() { if (!saving.current && !pending) onClose(blocked); }
  function handleShortcut(event: KeyboardEvent<HTMLFormElement>) { if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); if (!event.repeat && !pending && !blocked && !saving.current) event.currentTarget.requestSubmit(); } }
  return <Sheet open modal={false} onOpenChange={function handleOpen(open) { if (!open) handleClose(); }}><SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl" closeDisabled={pending} onInteractOutside={function handleOutside(event) { event.preventDefault(); }} onEscapeKeyDown={function handleEscape(event) { if (pending || saving.current) event.preventDefault(); }} onOpenAutoFocus={function handleFocus(event) { event.preventDefault(); form.setFocus("name"); }} onCloseAutoFocus={function handleReturn(event) { event.preventDefault(); onReturnFocus(); }}>
    <SheetHeader className="border-b p-6 text-left"><p className="eyebrow">{t("HR / Employee profile")}</p><SheetTitle>{employee ? t("Редактировать сотрудника") : t("Новый сотрудник")}</SheetTitle><SheetDescription>{t("Рабочий профиль и подчинение в команде.")}</SheetDescription></SheetHeader>
    <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={form.handleSubmit(handleSubmit)} onKeyDown={handleShortcut} aria-busy={pending}><div className="min-h-0 flex-1 overflow-y-auto p-6"><fieldset disabled={pending || blocked} className="space-y-4"><legend className="sr-only">{t("Профиль сотрудника")}</legend>{([{ key: "name", label: t("Имя и фамилия *"), max: 200, required: true, type: "text" }, { key: "employeeId", label: t("Табельный номер *"), max: 64, required: true, type: "text" }, { key: "position", label: t("Должность"), max: 200, required: false, type: "text" }, { key: "department", label: t("Отдел"), max: 100, required: false, type: "text" }, { key: "email", label: t("Рабочий email"), max: 254, required: false, type: "email" }, { key: "phone", label: t("Рабочий телефон"), max: 64, required: false, type: "tel" }, { key: "hireDate", label: t("Дата приёма *"), max: 10, required: true, type: "date" }] as const).map((field) => <div key={field.key}><label className="mb-2 block text-xs font-medium" htmlFor={`${id}-${field.key}`}>{t(field.label)}</label><Input id={`${id}-${field.key}`} type={field.type} maxLength={field.max} {...form.register(field.key)} aria-required={field.required} aria-invalid={Boolean(form.formState.errors[field.key])} aria-describedby={`${id}-${field.key}-error`} /><p id={`${id}-${field.key}-error`} role={form.formState.errors[field.key] ? "alert" : undefined} className="mt-1 text-xs text-destructive">{t(form.formState.errors[field.key]?.message)}</p></div>)}
      <div><label className="mb-2 block text-xs font-medium" htmlFor={`${id}-status`}>{t("Статус")}</label><select id={`${id}-status`} className="input" {...form.register("status")}>{employeeStatuses.map((status) => <option key={status} value={status}>{t(EMPLOYEE_STATUS_LABELS[status])}</option>)}</select><p className="mt-1 text-xs text-destructive">{t(form.formState.errors.status?.message)}</p></div><EmployeeManagerPicker selected={manager} {...(employee ? { excludeId: employee.id } : {})} disabled={pending || blocked} onSelect={function handleManager(selected) { setManager(selected); form.setValue("managerId", selected?.id ?? "", { shouldDirty: true, shouldValidate: true }); }} /><p className="text-xs text-destructive">{t(form.formState.errors.managerId?.message)}</p>
    </fieldset>{error && <p role="alert" className="mt-5 text-xs text-destructive">{t(error)}</p>}{blocked && <Button type="button" variant="outline" className="mt-4" onClick={function handleReload() { onClose(); onReload(); }}>{t("Закрыть и обновить")}</Button>}</div><footer className="border-t px-6 py-4"><p className="mb-4 text-[11px] text-muted-foreground">{t("⌘ / Ctrl + Enter — сохранить · Esc — закрыть")}</p><div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={handleClose}>{t("Отмена")}</Button><Button type="submit" disabled={pending || blocked}>{pending && <Spinner />}{t("Сохранить сотрудника")}</Button></div></footer></form>
  </SheetContent></Sheet>;
}
