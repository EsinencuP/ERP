"use client";
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
import { createProduct, updateProduct } from "../actions";
import { PRODUCT_CURRENCIES, productFormSchema } from "../schema";
import type { Product } from "../types";

type FormValues = z.input<typeof productFormSchema>;
const fields = [
  { key: "sku", label: "SKU *", limit: 64 }, { key: "name", label: "Наименование *", limit: 200 },
  { key: "category", label: "Категория", limit: 100 }, { key: "unit", label: "Единица *", limit: 32 },
  { key: "salePrice", label: "Цена *", limit: 21 }, { key: "minStock", label: "MinStock *", limit: 21 },
] as const;

/** Create/edit catalog fields in a non-modal versioned Sheet without directly editing warehouse stock. */
export function ProductFormSheet({ product: initialProduct, onSaved, onClose, onReload, onReturnFocus }: { product?: Product; onSaved: () => void; onClose: (needsReload?: boolean) => void; onReload: () => void; onReturnFocus: () => void }) {
  const product = useRef(initialProduct).current, id = useId(), saving = useRef(false);
  const [error, setError] = useState(""), [blocked, setBlocked] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(productFormSchema), mode: "onBlur", reValidateMode: "onBlur", defaultValues: { sku: product?.sku ?? "", name: product?.name ?? "", category: product?.category ?? "", description: product?.description ?? "", unit: product?.unit ?? "pcs", currency: product?.currency === "USD" || product?.currency === "EUR" ? product.currency : "RUB", salePrice: product ? `${BigInt(product.salePrice) / 100n}.${(BigInt(product.salePrice) % 100n).toString().padStart(2, "0")}` : "", minStock: product?.minStock ?? "0", isActive: product?.isActive ?? true } });
  const pending = form.formState.isSubmitting, locked = pending || blocked;
  async function handleSubmit(input: FormValues) {
    if (saving.current || blocked) return;
    saving.current = true; setError("");
    try {
      const [whole = "0", fraction = ""] = input.salePrice.split(".");
      const payload = { ...input, salePrice: (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))).toString() };
      const result = product ? await updateProduct(product.id, product.version, payload) : await createProduct(payload);
      if (!result.ok) { setError(result.error.message); setBlocked(result.error.code !== "VALIDATION"); toast.error(result.error.message); return; }
      toast.success(product ? "Товар обновлён" : "Товар создан"); onSaved();
    } catch { const message = "Результат записи неизвестен. Закройте форму, обновите каталог и проверьте товар перед повтором"; setError(message); setBlocked(true); toast.error(message); }
    finally { saving.current = false; }
  }
  function handleClose() { if (!saving.current && !pending) onClose(blocked); }
  function handleShortcut(event: KeyboardEvent<HTMLFormElement>) { if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); if (!event.repeat && !locked && !saving.current) event.currentTarget.requestSubmit(); } }
  return <Sheet open modal={false} onOpenChange={function handleOpen(open) { if (!open) handleClose(); }}><SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg" closeDisabled={pending} onInteractOutside={function handleOutside(event) { event.preventDefault(); }} onEscapeKeyDown={function handleEscape(event) { if (pending || saving.current) event.preventDefault(); }} onOpenAutoFocus={function handleFocus(event) { event.preventDefault(); form.setFocus("sku"); }} onCloseAutoFocus={function handleReturn(event) { event.preventDefault(); onReturnFocus(); }}>
    <SheetHeader className="border-b p-6 text-left"><p className="eyebrow">Inventory / Products</p><SheetTitle className="pr-7">{product ? "Редактировать товар" : "Новый товар"}</SheetTitle><SheetDescription>SKU, цена и порог пополнения. Остаток рассчитывается по складам.</SheetDescription></SheetHeader>
    <form onSubmit={form.handleSubmit(handleSubmit, function handleInvalid() { toast.error("Проверьте поля товара"); })} onKeyDown={handleShortcut} className="flex min-h-0 flex-1 flex-col" noValidate aria-busy={pending}>
      <div className="min-h-0 flex-1 overflow-y-auto p-6"><fieldset disabled={locked} className="grid gap-5 sm:grid-cols-2"><legend className="sr-only">Данные товара</legend>
        {fields.map((field) => { const message = form.formState.errors[field.key]?.message, numeric = field.key === "salePrice" || field.key === "minStock"; return <div key={field.key} className={field.key === "name" ? "sm:col-span-2" : ""}><label htmlFor={`${id}-${field.key}`} className="mb-2 block text-xs font-medium">{field.label}</label><Input id={`${id}-${field.key}`} maxLength={field.limit} inputMode={numeric ? "decimal" : "text"} {...form.register(field.key, numeric ? { setValueAs: (value: string) => value.trim().replace(",", ".") } : {})} aria-required={field.key !== "category"} aria-invalid={Boolean(message)} aria-describedby={`${id}-${field.key}-error`} /><p id={`${id}-${field.key}-error`} role={message ? "alert" : undefined} className="mt-1 text-xs text-destructive">{message}</p></div>; })}
        <div><label htmlFor={`${id}-currency`} className="mb-2 block text-xs font-medium">Валюта *</label><select id={`${id}-currency`} className="input w-full" {...form.register("currency")}>{PRODUCT_CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</select></div>
        <label className="flex items-center gap-2 text-xs" htmlFor={`${id}-active`}><input id={`${id}-active`} type="checkbox" className="size-4 accent-primary" {...form.register("isActive")} />Активный товар</label>
        <div className="sm:col-span-2"><label htmlFor={`${id}-description`} className="mb-2 block text-xs font-medium">Описание</label><Textarea id={`${id}-description`} maxLength={10000} rows={4} {...form.register("description")} /><p role={form.formState.errors.description ? "alert" : undefined} className="mt-1 text-xs text-destructive">{form.formState.errors.description?.message}</p></div>
      </fieldset><p className="mt-5 text-xs leading-relaxed text-muted-foreground">MinStock — минимальный запас в указанной единице, до 3 знаков после точки. Новый товар создаётся с нулевым остатком.</p>{error && <p role="alert" className="mt-4 rounded-lg border border-destructive/30 p-3 text-xs text-destructive">{error}</p>}{blocked && <Button type="button" variant="outline" className="mt-3" disabled={pending} onClick={function handleReload() { onClose(); onReload(); }}>Закрыть и обновить</Button>}</div>
      <footer className="border-t px-6 py-4"><p className="mb-4 text-[11px] text-muted-foreground">⌘ / Ctrl + Enter — сохранить · Esc — закрыть</p><div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={handleClose}>Отмена</Button><Button type="submit" disabled={locked}>{pending && <Spinner />}{pending ? "Сохранение…" : "Сохранить товар"}</Button></div></footer>
    </form>
  </SheetContent></Sheet>;
}
