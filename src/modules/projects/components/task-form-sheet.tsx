"use client";
import { useI18n } from "@/i18n/use-i18n";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecordPicker } from "@/components/ui/record-picker";
import { Spinner } from "@/components/ui/feedback";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { createTask, updateTask, getTaskProjects, getTaskAssignees } from "../actions";
import { taskSchema, TASK_STATUSES, TASK_PRIORITIES } from "../task-schema";
import type { Task, TaskInput, TaskProject, TaskAssignee } from "../task-types";
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "./task-presentation";

/** Create or edit a task using shared Sheet/RHF patterns and a captured opening version. */
export function TaskFormSheet({ task: initial, project: initialProject, onSaved, onClose, onReturnFocus }: { task?: Task; project?: TaskProject | null; onSaved: () => void; onClose: (reload?: boolean) => void; onReturnFocus: () => void }) {
  const { t } = useI18n();

  const task = useRef(initial).current, saving = useRef(false), id = useId(), [blocked, setBlocked] = useState(false), [error, setError] = useState("");
  const [project, setProject] = useState<TaskProject | null>(task?.project ?? initialProject ?? null), [assignee, setAssignee] = useState<TaskAssignee | null>(task?.assignedTo ?? null);
  const form = useForm<TaskInput>({ resolver: zodResolver(taskSchema), mode: "onBlur", reValidateMode: "onBlur", defaultValues: { projectId: task?.projectId ?? initialProject?.id ?? "", title: task?.title ?? "", description: task?.description ?? "", status: task?.status === "CANCELLED" ? "TODO" : task?.status ?? "TODO", priority: task?.priority ?? "MEDIUM", assignedToId: task?.assignedToId ?? "", dueDate: task?.dueDate ?? "" } });
  const pending = form.formState.isSubmitting;
  function handleClose() { if (!saving.current && !pending) onClose(blocked); }
  function handleShortcut(event: KeyboardEvent<HTMLFormElement>) { if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.repeat && !event.nativeEvent.isComposing) { event.preventDefault(); if (!saving.current && !blocked) event.currentTarget.requestSubmit(); } }
  async function handleSubmit(input: TaskInput) {
    if (saving.current || blocked) return; saving.current = true; setError("");
    try { const result = task ? await updateTask(task.id, task.version, input) : await createTask(input); if (!result.ok) { setError(result.error.message); setBlocked(result.error.code !== "VALIDATION"); return; } toast.success(t(task ? t("Задача обновлена") : t("Задача создана"))); onSaved(); }
    catch { setError(t("Результат записи неизвестен. Закройте форму и обновите задачи перед повтором")); setBlocked(true); }
    finally { saving.current = false; }
  }
  return <Sheet open modal={false} onOpenChange={function handleOpen(open) { if (!open) handleClose(); }}><SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl" closeDisabled={pending} onInteractOutside={function handleOutside(event) { event.preventDefault(); }} onEscapeKeyDown={function handleEscape(event) { if (pending || saving.current) event.preventDefault(); }} onOpenAutoFocus={function handleFocus(event) { event.preventDefault(); form.setFocus("title"); }} onCloseAutoFocus={function handleFocus(event) { event.preventDefault(); onReturnFocus(); }}><SheetHeader className="border-b p-6 text-left"><p className="eyebrow">{t("Projects / Task")}</p><SheetTitle>{task ? t("Редактировать задачу") : t("Новая задача")}</SheetTitle><SheetDescription>{t("Название, исполнитель, приоритет и срок выполнения.")}</SheetDescription></SheetHeader><form noValidate onSubmit={form.handleSubmit(handleSubmit)} onKeyDown={handleShortcut} className="flex min-h-0 flex-1 flex-col" aria-busy={pending}><div className="min-h-0 flex-1 overflow-y-auto p-6"><fieldset disabled={pending || blocked} className="space-y-4"><legend className="sr-only">{t("Данные задачи")}</legend>
    <div><label htmlFor={`${id}-title`} className="mb-2 block text-xs font-medium">{t("Название задачи *")}</label><Input id={`${id}-title`} maxLength={200} {...form.register("title")} aria-invalid={Boolean(form.formState.errors.title)} aria-describedby={`${id}-title-error`} /><p id={`${id}-title-error`} className="mt-1 text-xs text-destructive">{t(form.formState.errors.title?.message)}</p></div>
    <RecordPicker label={t("Проект задачи *")} selected={project} disabled={Boolean(task) || pending || blocked} load={getTaskProjects} emptyLabel={t("Выберите проект")} onSelect={function handleProject(value) { setProject(value); form.setValue("projectId", value?.id ?? "", { shouldDirty: true, shouldValidate: true }); }} /><p className="text-xs text-destructive">{t(form.formState.errors.projectId?.message)}</p>
    <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor={`${id}-status`} className="mb-2 block text-xs font-medium">{t("Статус задачи")}</label><select id={`${id}-status`} className="input" {...form.register("status")}>{TASK_STATUSES.map((value) => <option key={value} value={value}>{value} · {t(TASK_STATUS_LABELS[value])}</option>)}</select></div><div><label htmlFor={`${id}-priority`} className="mb-2 block text-xs font-medium">{t("Приоритет задачи")}</label><select id={`${id}-priority`} className="input" {...form.register("priority")}>{TASK_PRIORITIES.map((value) => <option key={value} value={value}>{t(TASK_PRIORITY_LABELS[value])}</option>)}</select></div></div>
    <RecordPicker label={t("Исполнитель задачи")} selected={assignee} disabled={pending || blocked} load={getTaskAssignees} emptyLabel={t("Не назначен")} onSelect={function handleAssignee(value) { setAssignee(value); form.setValue("assignedToId", value?.id ?? "", { shouldDirty: true, shouldValidate: true }); }} />
    <div><label htmlFor={`${id}-due`} className="mb-2 block text-xs font-medium">{t("Срок задачи")}</label><Input id={`${id}-due`} type="date" min="1900-01-01" max="9999-12-31" {...form.register("dueDate")} aria-invalid={Boolean(form.formState.errors.dueDate)} aria-describedby={`${id}-due-error`} /><p id={`${id}-due-error`} className="mt-1 text-xs text-destructive">{t(form.formState.errors.dueDate?.message)}</p><p className="mt-1 text-[11px] text-muted-foreground">{t("До конца выбранного дня по Москве.")}</p></div>
    <div><label htmlFor={`${id}-description`} className="mb-2 block text-xs font-medium">{t("Описание задачи")}</label><textarea id={`${id}-description`} className="input min-h-28 resize-y" maxLength={4000} {...form.register("description")} /><p className="text-xs text-destructive">{t(form.formState.errors.description?.message)}</p></div>
    </fieldset>{error && <p role="alert" className="mt-4 text-sm text-destructive">{t(error)}</p>}{blocked && <Button type="button" variant="outline" className="mt-4" onClick={function handleReload() { onClose(true); }}>{t("Закрыть и обновить")}</Button>}</div><footer className="border-t px-6 py-4"><p className="mb-3 text-[11px] text-muted-foreground">{t("⌘ / Ctrl + Enter — сохранить · Esc — закрыть")}</p><div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={handleClose}>{t("Отмена")}</Button><Button type="submit" disabled={pending || blocked}>{pending && <Spinner />}{t("Сохранить задачу")}</Button></div></footer></form></SheetContent></Sheet>;
}
