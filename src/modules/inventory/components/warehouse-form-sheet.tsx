"use client";
import { useI18n } from "@/i18n/use-i18n";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/feedback";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { createWarehouse, updateWarehouse } from "../actions";
import { warehouseSchema } from "../schema";
import type { Warehouse } from "../types";

type FormValues = z.input<typeof warehouseSchema>;
/** Edit versioned warehouse metadata while retaining every stock and ledger reference. */
export function WarehouseFormSheet({ warehouse: initial, onSaved, onClose, onReload, onReturnFocus }: { warehouse?: Warehouse; onSaved: () => void; onClose: (needsReload?: boolean) => void; onReload: () => void; onReturnFocus: () => void }) {
  const { t } = useI18n();

  const warehouse = useRef(initial).current, id = useId(), saving = useRef(false);
  const [error, setError] = useState(""), [blocked, setBlocked] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(warehouseSchema), mode: "onBlur", reValidateMode: "onBlur", defaultValues: { code: warehouse?.code ?? "", name: warehouse?.name ?? "", address: warehouse?.address ?? "", isActive: warehouse?.isActive ?? true } });
  const pending = form.formState.isSubmitting;
  async function handleSubmit(input: FormValues) {
    if (saving.current || blocked) return; saving.current = true; setError("");
    try { const result = warehouse ? await updateWarehouse(warehouse.id, warehouse.version, input) : await createWarehouse(input); if (!result.ok) { setError(result.error.message); setBlocked(result.error.code !== "VALIDATION"); toast.error(t(result.error.message)); return; } toast.success(t(warehouse ? t("Склад обновлён") : t("Склад создан"))); onSaved(); }
    catch { const message = t("Результат записи неизвестен. Закройте форму и обновите склады перед повтором"); setError(message); setBlocked(true); toast.error(t(message)); }
    finally { saving.current = false; }
  }
  function handleClose() { if (!saving.current && !pending) onClose(blocked); }
  function handleShortcut(event: KeyboardEvent<HTMLFormElement>) { if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); if (!event.repeat && !pending && !blocked && !saving.current) event.currentTarget.requestSubmit(); } }
  return <Sheet open modal={false} onOpenChange={function handleOpen(open) { if (!open) handleClose(); }}><SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg" closeDisabled={pending} onInteractOutside={function handleOutside(event) { event.preventDefault(); }} onEscapeKeyDown={function handleEscape(event) { if (pending || saving.current) event.preventDefault(); }} onOpenAutoFocus={function handleFocus(event) { event.preventDefault(); form.setFocus("code"); }} onCloseAutoFocus={function handleReturn(event) { event.preventDefault(); onReturnFocus(); }}>
    <SheetHeader className="border-b p-6 text-left"><p className="eyebrow">{t("Inventory / Warehouses")}</p><SheetTitle>{warehouse ? t("Редактировать склад") : t("Новый склад")}</SheetTitle><SheetDescription>{t("Деактивация сохраняет остатки и журнал движений.")}</SheetDescription></SheetHeader>
    <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={form.handleSubmit(handleSubmit)} onKeyDown={handleShortcut} aria-busy={pending}><div className="min-h-0 flex-1 overflow-y-auto p-6"><fieldset disabled={pending || blocked} className="space-y-5"><legend className="sr-only">{t("Склад")}</legend>{([{ key: "code", label: t("Код склада *"), max: 32 }, { key: "name", label: t("Название склада *"), max: 200 }] as const).map((field) => <div key={field.key}><label className="mb-2 block text-xs font-medium" htmlFor={`${id}-${field.key}`}>{t(field.label)}</label><Input id={`${id}-${field.key}`} maxLength={field.max} {...form.register(field.key)} aria-required aria-invalid={Boolean(form.formState.errors[field.key])} aria-describedby={`${id}-${field.key}-error`} /><p id={`${id}-${field.key}-error`} role={form.formState.errors[field.key] ? "alert" : undefined} className="mt-1 text-xs text-destructive">{t(form.formState.errors[field.key]?.message)}</p></div>)}<div><label className="mb-2 block text-xs font-medium" htmlFor={`${id}-address`}>{t("Адрес")}</label><Textarea id={`${id}-address`} rows={3} maxLength={2000} {...form.register("address")} /><p className="mt-1 text-xs text-destructive">{t(form.formState.errors.address?.message)}</p></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" className="size-4 accent-primary" {...form.register("isActive")} />{t("Активный склад")}</label></fieldset>{error && <p role="alert" className="mt-5 text-xs text-destructive">{t(error)}</p>}{blocked && <Button type="button" variant="outline" className="mt-4" onClick={function handleReload() { onClose(); onReload(); }}>{t("Закрыть и обновить")}</Button>}</div><footer className="border-t px-6 py-4"><p className="mb-4 text-[11px] text-muted-foreground">{t("⌘ / Ctrl + Enter — сохранить · Esc — закрыть")}</p><div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={handleClose}>{t("Отмена")}</Button><Button type="submit" disabled={pending || blocked}>{pending && <Spinner />}{t("Сохранить склад")}</Button></div></footer></form>
  </SheetContent></Sheet>;
}
