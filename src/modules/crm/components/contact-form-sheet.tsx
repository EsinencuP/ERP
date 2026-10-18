"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { Result } from "@/types/shared";
import { CONTACT_STAGES, contactFormSchema } from "../schema";
import type { ContactTableRow } from "../types";
import { CONTACT_STAGE_LABELS } from "./contact-presentation";

export type ContactFormValues = z.input<typeof contactFormSchema>;
type ContactFormSheetProps = {
  contact?: ContactTableRow;
  disabled: boolean;
  onSave: (input: ContactFormValues) => Promise<Result<true>>;
  onClose: () => void;
  onReload: () => void;
  onReturnFocus?: () => void;
};

/** Create or edit a contact in a non-modal sheet with blur validation and scoped keyboard shortcuts. */
export function ContactFormSheet({ contact, disabled, onSave, onClose, onReload, onReturnFocus }: ContactFormSheetProps) {
  const id = useId();
  const opener = useRef<HTMLElement | null>(null);
  const submitting = useRef(false);
  const [error, setError] = useState("");
  const [needsReload, setNeedsReload] = useState(false);
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema), mode: "onBlur", reValidateMode: "onBlur",
    defaultValues: { name: contact?.name ?? "", company: contact?.company ?? "", email: contact?.email ?? "", phone: contact?.phone ?? "", address: contact?.address ?? "", notes: contact?.notes ?? "", stage: contact?.stage ?? "LEAD" },
  });
  const pending = form.formState.isSubmitting;
  const locked = disabled || pending || needsReload;

  async function handleSubmit(input: ContactFormValues) {
    if (submitting.current || disabled || needsReload) return;
    submitting.current = true; setError("");
    try {
      const result = await onSave(input);
      if (!result.ok) {
        setError(result.error.message); setNeedsReload(result.error.code !== "VALIDATION");
        toast.error(result.error.message); return;
      }
      toast.success(contact ? "Контакт обновлён" : "Контакт создан"); onClose();
    } catch {
      const message = "Результат сохранения не подтверждён. Обновите контакты и проверьте запись перед повтором";
      setError(message); setNeedsReload(true); toast.error(message);
    } finally { submitting.current = false; }
  }
  function handleInvalid() { toast.error("Проверьте поля формы"); }
  function handleShortcut(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.nativeEvent.isComposing) {
      event.preventDefault(); if (!event.repeat && !locked && !submitting.current) event.currentTarget.requestSubmit();
    }
  }
  function handleClose() { if (!submitting.current && !pending) onClose(); }

  return <Sheet open modal={false} onOpenChange={function handleOpenChange(open) { if (!open) handleClose(); }}>
    <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg" closeDisabled={pending}
      onInteractOutside={function handleOutside(event) { event.preventDefault(); }}
      onEscapeKeyDown={function handleEscape(event) { if (submitting.current || pending) event.preventDefault(); }}
      onOpenAutoFocus={function handleOpenFocus(event) { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; event.preventDefault(); form.setFocus("name"); }}
      onCloseAutoFocus={function handleCloseFocus(event) { event.preventDefault(); if (onReturnFocus) onReturnFocus(); else if (opener.current?.isConnected) opener.current.focus({ preventScroll: true }); }}>
      <SheetHeader className="border-b px-6 py-6 text-left"><p className="eyebrow text-muted-foreground">CRM / Контакты</p><SheetTitle className="pr-7">{contact ? "Редактировать контакт" : "Новый контакт"}</SheetTitle><SheetDescription>{contact ? "Изменения сохранятся в карточке контакта." : "Таблица остаётся доступной. Сохраните изменения, когда будете готовы."}</SheetDescription></SheetHeader>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(handleSubmit, handleInvalid)} onKeyDown={handleShortcut} noValidate aria-busy={pending}>
        <div className="relative min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <fieldset disabled={locked} className="grid gap-5 sm:grid-cols-2"><legend className="sr-only">Данные контакта</legend>
            {([{ key: "name", label: "Имя", type: "text", max: 160, autoComplete: "name" }, { key: "company", label: "Компания", type: "text", max: 200, autoComplete: "organization" }, { key: "email", label: "Email", type: "email", max: 200, autoComplete: "email" }, { key: "phone", label: "Телефон", type: "tel", max: 64, autoComplete: "tel" }, { key: "address", label: "Адрес", type: "text", max: 1000, autoComplete: "street-address" }] as const).map((field) => <div key={field.key} className={field.key === "address" ? "sm:col-span-2" : ""}>
              <label className="mb-2 block text-xs font-medium" htmlFor={`${id}-${field.key}`}>{field.label}{field.key === "name" ? " *" : ""}</label>
              <Input id={`${id}-${field.key}`} type={field.type} maxLength={field.max} autoComplete={field.autoComplete} {...form.register(field.key)} aria-required={field.key === "name"} aria-invalid={Boolean(form.formState.errors[field.key])} aria-describedby={form.formState.errors[field.key] ? `${id}-error-${field.key}` : undefined} />
              {form.formState.errors[field.key] && <p role="alert" className="mt-1.5 text-xs text-destructive" id={`${id}-error-${field.key}`}>{form.formState.errors[field.key]?.message}</p>}
            </div>)}
            <div className="sm:col-span-2"><label htmlFor={`${id}-stage`} className="mb-2 block text-xs font-medium">Этап</label><select id={`${id}-stage`} className="input w-full" {...form.register("stage")} aria-invalid={Boolean(form.formState.errors.stage)} aria-describedby={form.formState.errors.stage ? `${id}-error-stage` : undefined}>{CONTACT_STAGES.map((stage) => <option key={stage} value={stage}>{CONTACT_STAGE_LABELS[stage]}</option>)}</select>{form.formState.errors.stage && <p role="alert" id={`${id}-error-stage`} className="mt-1.5 text-xs text-destructive">{form.formState.errors.stage.message}</p>}</div>
            <div className="sm:col-span-2"><label htmlFor={`${id}-notes`} className="mb-2 block text-xs font-medium">Комментарий</label><Textarea id={`${id}-notes`} rows={4} maxLength={10000} {...form.register("notes")} aria-invalid={Boolean(form.formState.errors.notes)} aria-describedby={form.formState.errors.notes ? `${id}-error-notes` : undefined} />{form.formState.errors.notes && <p role="alert" id={`${id}-error-notes`} className="mt-1.5 text-xs text-destructive">{form.formState.errors.notes.message}</p>}</div>
          </fieldset>
          {error && <div role="alert" className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{error}{needsReload && <p className="mt-2">Перед повторной записью закройте форму и обновите данные.</p>}</div>}
          {needsReload && <Button type="button" variant="outline" className="mt-3" disabled={pending} onClick={function handleReload() { onClose(); onReload(); }}>Закрыть и обновить</Button>}
        </div>
        <footer className="border-t px-6 py-4"><p className="mb-4 text-[11px] text-muted-foreground">⌘ / Ctrl + Enter — сохранить · Esc — закрыть</p><div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={handleClose}>Отмена</Button><Button type="submit" disabled={locked}>{pending && <Spinner />}{pending ? "Сохранение…" : "Сохранить контакт"}</Button></div></footer>
      </form>
    </SheetContent>
  </Sheet>;
}
