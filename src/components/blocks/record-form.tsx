"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/feedback";
import { defaultRecord } from "@/lib/record-schema";
import { modules, schemas } from "@/lib/modules";
import type { DocumentRecord, Domain, RecordData, Result } from "@/types/shared";

/** Shared DocType form with RHF, Zod validation and precise ruble-to-kopeck conversion. */
export function RecordForm({ domain, record, onSave, onClose }: { domain: Domain; record: DocumentRecord | null; onSave: (data: RecordData) => Promise<Result<DocumentRecord>>; onClose: () => void }) {
  const definition = modules[domain];
  const [error, setError] = useState("");
  const hasSettlement = record && ["Оплачен", "Частично оплачен"].includes(record.data.status);
  const schema = z.preprocess((input) => {
    if (typeof input === "object" && input !== null && "amount" in input && typeof input.amount === "number") return { ...input, amount: Math.round(input.amount * 100) };
    return input;
  }, schemas[domain]);
  const form = useForm<RecordData>({ resolver: zodResolver(schema), defaultValues: record ? { ...record.data, amount: record.data.amount / 100 } : { ...defaultRecord, status: definition.statuses[0] ?? "" } });

  async function handleSubmit(data: RecordData) {
    setError("");
    try { const result = await onSave(data); if (!result.ok) setError(result.error.message); else onClose(); }
    catch { setError("Связь с сервером прервана. Проверьте соединение и обновите страницу"); }
  }

  return <Dialog open onOpenChange={function handleOpenChange(open) { if (!open && !form.formState.isSubmitting) onClose(); }}><DialogContent onInteractOutside={(event) => { if (form.formState.isSubmitting) event.preventDefault(); }} onEscapeKeyDown={(event) => { if (form.formState.isSubmitting) event.preventDefault(); }}><DialogTitle className="text-xl font-medium tracking-tight">{record ? "Редактировать" : "Добавить"} {definition.singular}</DialogTitle><DialogDescription className="mb-6 mt-2 text-xs muted">{record ? "Изменения будут сохранены в текущем рабочем пространстве." : "Заполните данные. Поля со звёздочкой обязательны."}</DialogDescription><form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">{definition.fields.map((field) => {
      const id = `field-${field.key}`;
      const errorMessage = form.formState.errors[field.key]?.message;
      const disabled = Boolean(domain === "finance" && hasSettlement && ["amount", "subtitle", "status"].includes(field.key));
      if (domain === "inventory" && field.key === "status") return <p key={field.key} className="text-[10px] leading-relaxed muted sm:col-span-2">Статус запаса определяется остатком: 0 — нет в наличии, 1–3 — мало, от 4 — в наличии.</p>;
      if (disabled && field.key === "status") return <div key={field.key}><span className="field-label">{field.label}</span><div className="input items-center opacity-60" aria-label="Статус определяется поступлениями">{record?.data.status}</div><input type="hidden" {...form.register("status")} /></div>;
      const options = domain === "finance" && !hasSettlement ? ["Черновик", "Отправлен"] : definition.statuses;
      return <div key={field.key} className={field.type === "textarea" || field.key === "title" || field.key === "subtitle" ? "sm:col-span-2" : ""}><label className="field-label" htmlFor={id}>{field.label}{field.required && <span className="ml-1 text-[hsl(var(--color-primary))]">*</span>}</label>{field.type === "textarea" ? <textarea id={id} className="input min-h-20 resize-y py-2.5" {...form.register(field.key)} aria-invalid={Boolean(errorMessage)} aria-describedby={errorMessage ? `${id}-error` : undefined} /> : field.type === "select" ? <select id={id} className="input" {...form.register(field.key)} disabled={disabled} aria-invalid={Boolean(errorMessage)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <Input id={id} type={field.type === "money" || field.type === "number" ? "number" : field.type} step={field.type === "money" ? "0.01" : field.type === "number" ? "1" : undefined} min={field.type === "money" || field.type === "number" ? "0" : undefined} max={field.key === "progress" ? "100" : undefined} {...form.register(field.key, { valueAsNumber: field.type === "money" || field.type === "number" })} readOnly={disabled} autoComplete={field.type === "email" ? "email" : "off"} aria-required={field.required} aria-invalid={Boolean(errorMessage)} aria-describedby={errorMessage ? `${id}-error` : undefined} />}{errorMessage && <p id={`${id}-error`} className="mt-1.5 text-[10px] text-[hsl(var(--color-danger))]">{errorMessage}</p>}</div>;
    })}</div>{hasSettlement && domain === "finance" && <p className="rounded-lg bg-[hsl(var(--color-warning-soft))] p-3 text-[10px] text-[hsl(var(--color-warning))]">У счёта есть поступления. Сумма, клиент и статус защищены от изменения.</p>}{error && <p role="alert" className="rounded-lg bg-[hsl(var(--color-danger-soft))] p-3 text-xs text-[hsl(var(--color-danger))]">{error}</p>}<div className="flex justify-end gap-2 border-t pt-5"><Button variant="outline" type="button" onClick={onClose} disabled={form.formState.isSubmitting}>Отмена</Button><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Spinner /> : record ? <Check /> : <Plus />}{record ? "Сохранить" : "Добавить"}</Button></div>
  </form></DialogContent></Dialog>;
}
