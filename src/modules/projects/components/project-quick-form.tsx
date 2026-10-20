"use client";
import { useI18n } from "@/i18n/use-i18n";

import { useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { createTaskProject } from "../actions";
import { taskProjectSchema } from "../task-schema";
import type { TaskProject, TaskProjectInput } from "../task-types";

/** Create the project container required by the normalized task model without implicit or demo projects. */
export function ProjectQuickForm({ onSaved, onClose, onReturnFocus }: { onSaved: (project: TaskProject) => void; onClose: (reload?: boolean) => void; onReturnFocus: () => void }) {
  const { t } = useI18n();

  const id = useId(), saving = useRef(false), [blocked, setBlocked] = useState(false), [error, setError] = useState("");
  const form = useForm<TaskProjectInput>({ resolver: zodResolver(taskProjectSchema), mode: "onBlur", defaultValues: { code: "", name: "" } }), pending = form.formState.isSubmitting;
  function handleClose() { if (!saving.current) onClose(blocked); }
  async function handleSubmit(input: TaskProjectInput) { if (saving.current || blocked) return; saving.current = true; try { const result = await createTaskProject(input); if (!result.ok) { setError(result.error.message); setBlocked(result.error.code !== "VALIDATION"); return; } onSaved(result.data); } catch { setError(t("Результат записи неизвестен. Обновите данные перед повтором")); setBlocked(true); } finally { saving.current = false; } }
  return <Sheet open modal={false} onOpenChange={function handleOpen(open) { if (!open) handleClose(); }}><SheetContent className="w-full sm:max-w-lg" closeDisabled={pending} onInteractOutside={function handleOutside(event) { event.preventDefault(); }} onEscapeKeyDown={function handleEscape(event) { if (saving.current || pending) event.preventDefault(); }} onCloseAutoFocus={function handleFocus(event) { event.preventDefault(); onReturnFocus(); }}><SheetHeader className="text-left"><SheetTitle>{t("Новый проект")}</SheetTitle><SheetDescription>{t("Создайте проект, чтобы объединить задачи команды.")}</SheetDescription></SheetHeader><form className="mt-6 space-y-5" noValidate onSubmit={form.handleSubmit(handleSubmit)} onKeyDown={function handleShortcut(event) { if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.repeat && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.requestSubmit(); } }}><fieldset disabled={pending || blocked} className="space-y-4">{([{ key: "name", label: t("Название проекта *"), max: 200 }, { key: "code", label: t("Код проекта *"), max: 64 }] as const).map((field) => <div key={field.key}><label htmlFor={`${id}-${field.key}`} className="mb-2 block text-xs font-medium">{t(field.label)}</label><Input id={`${id}-${field.key}`} maxLength={field.max} {...form.register(field.key)} aria-invalid={Boolean(form.formState.errors[field.key])} aria-describedby={`${id}-${field.key}-error`} /><p id={`${id}-${field.key}-error`} className="mt-1 text-xs text-destructive">{t(form.formState.errors[field.key]?.message)}</p></div>)}</fieldset>{error && <p role="alert" className="text-sm text-destructive">{t(error)}</p>}<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={handleClose}>{t("Отмена")}</Button>{blocked ? <Button type="button" variant="outline" onClick={function handleReload() { onClose(true); }}>{t("Закрыть и обновить")}</Button> : <Button type="submit" disabled={pending}>{t("Создать проект")}</Button>}</div></form></SheetContent></Sheet>;
}
