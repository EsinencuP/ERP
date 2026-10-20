"use client";
import { formatUnit } from "@/lib/utils";
import { useI18n } from "@/i18n/use-i18n";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/feedback";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { createStockMovement, getStockPosition, getWarehouses } from "../actions";
import { MOVEMENT_KINDS, stockMovementSchema } from "../schema";
import { formatStockQuantity } from "../stock";
import type { MovementKind, Product, StockPosition, Warehouse } from "../types";

export const MOVEMENT_LABELS: Record<MovementKind, string> = { IN: "IN · Приход", OUT: "OUT · Списание", ADJUSTMENT: "ADJUSTMENT · Корректировка", TRANSFER: "TRANSFER · Перенос" };

/** Append an immutable ledger operation using freshly captured source/target stock versions. */
export function StockMovementSheet({ product, onSaved, onClose, onReturnFocus }: { product: Product; onSaved: () => void; onClose: (reload?: boolean) => void; onReturnFocus: () => void }) {
  const { t , locale: uiLocale } = useI18n();

  const id = useId(), saving = useRef(false), typeInput = useRef<HTMLSelectElement>(null);
  const [type, setType] = useState<MovementKind>("IN"), [quantity, setQuantity] = useState(""), [reference, setReference] = useState(""), [notes, setNotes] = useState("");
  const [search, setSearch] = useState(""), query = useDebouncedValue(search, 300), [warehouses, setWarehouses] = useState<Warehouse[]>([]), [warehouseCount, setWarehouseCount] = useState(0), [warehouseLoading, setWarehouseLoading] = useState(true);
  const [source, setSource] = useState<Warehouse | null>(null), [target, setTarget] = useState<Warehouse | null>(null), [positions, setPositions] = useState<{ source: StockPosition; target: StockPosition | null } | null>(null), [positionLoading, setPositionLoading] = useState(false);
  const [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false), [error, setError] = useState(""), [lookupError, setLookupError] = useState(""), [quantityError, setQuantityError] = useState("");
  useEffect(() => { let current = true; setWarehouseLoading(true); setLookupError(""); getWarehouses({ search: query, active: "active", pageSize: 100 }).then((result) => { if (!current) return; if (!result.ok) { setWarehouses([]); setLookupError(result.error.message); return; } setWarehouses(result.data.data); setWarehouseCount(result.data.total); }).catch(() => { if (current) { setWarehouses([]); setLookupError(t("Не удалось загрузить склады")); } }).finally(() => { if (current) setWarehouseLoading(false); }); return () => { current = false; }; }, [query]);
  const sourceId = source?.id, targetId = target?.id;
  useEffect(() => {
    let current = true; setPositions(null); setError("");
    if (!sourceId || (type === "TRANSFER" && !targetId)) { setPositionLoading(false); return; }
    setPositionLoading(true);
    Promise.all([getStockPosition(product.id, sourceId), type === "TRANSFER" && targetId ? getStockPosition(product.id, targetId) : Promise.resolve(null)]).then(([from, to]) => { if (!current) return; if (!from.ok) { setError(from.error.message); return; } if (to && !to.ok) { setError(to.error.message); return; } setPositions({ source: from.data, target: to?.data ?? null }); }).catch(() => { if (current) setError(t("Не удалось получить текущие остатки")); }).finally(() => { if (current) setPositionLoading(false); });
    return () => { current = false; };
  }, [product.id, sourceId, targetId, type]);
  const options = [...warehouses, ...[source, target].filter((warehouse): warehouse is Warehouse => warehouse !== null && !warehouses.some((row) => row.id === warehouse.id))].filter((warehouse, index, rows) => rows.findIndex((row) => row.id === warehouse.id) === index);
  function getPayload() { const base = { productId: product.id, warehouseId: source?.id ?? "", stockVersion: positions?.source.version ?? 0, quantity, reference, notes }; return type === "TRANSFER" ? { ...base, type, targetWarehouseId: target?.id ?? "", targetStockVersion: positions?.target?.version ?? 0 } : { ...base, type }; }
  function handleQuantityBlur() { const result = stockMovementSchema.safeParse(getPayload()); setQuantityError(result.success ? "" : result.error.issues.find((issue) => issue.path[0] === "quantity")?.message ?? ""); }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving.current || blocked) return;
    const parsed = stockMovementSchema.safeParse(getPayload());
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? t("Проверьте поля движения")); handleQuantityBlur(); return; }
    if (!positions || positionLoading || (type === "TRANSFER" && !positions.target)) { setError(t("Выберите склады и дождитесь загрузки остатков")); return; }
    saving.current = true; setBusy(true); setError("");
    try { const result = await createStockMovement(parsed.data); if (!result.ok) { setError(result.error.message); setBlocked(result.error.code !== "VALIDATION"); toast.error(t(result.error.message)); return; } toast.success(t(type === "TRANSFER" ? t("Перенос записан на обоих складах") : t("Движение записано"))); onSaved(); }
    catch { const message = t("Результат записи неизвестен. Закройте форму, обновите журнал и проверьте движение перед повтором"); setError(message); setBlocked(true); toast.error(t(message)); }
    finally { saving.current = false; setBusy(false); }
  }
  function handleClose() { if (!saving.current && !busy) onClose(blocked); }
  function handleShortcut(event: KeyboardEvent<HTMLFormElement>) { if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); if (!event.repeat && !busy && !blocked && !saving.current) event.currentTarget.requestSubmit(); } }
  return <Sheet open modal={false} onOpenChange={function handleOpen(open) { if (!open) handleClose(); }}><SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg" closeDisabled={busy} onInteractOutside={function handleOutside(event) { event.preventDefault(); }} onEscapeKeyDown={function handleEscape(event) { if (busy || saving.current) event.preventDefault(); }} onOpenAutoFocus={function handleFocus(event) { event.preventDefault(); typeInput.current?.focus(); }} onCloseAutoFocus={function handleReturn(event) { event.preventDefault(); onReturnFocus(); }}>
    <SheetHeader className="border-b p-6 text-left"><p className="eyebrow">{t("Inventory / Stock Entry")}</p><SheetTitle>{t("Записать движение")}</SheetTitle><SheetDescription>{product.sku} · {product.name}</SheetDescription></SheetHeader>
    <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={handleSubmit} onKeyDown={handleShortcut} aria-busy={busy}><div className="min-h-0 flex-1 overflow-y-auto p-6"><fieldset disabled={busy || blocked} className="space-y-5"><legend className="sr-only">{t("Новое движение")}</legend>
      <div><label htmlFor={`${id}-type`} className="mb-2 block text-xs font-medium">{t("Тип *")}</label><select ref={typeInput} id={`${id}-type`} className="input" value={type} onChange={function handleType(event) { const value = event.target.value; if (MOVEMENT_KINDS.some((kind) => kind === value)) { setType(value as MovementKind); setQuantityError(""); } }}>{MOVEMENT_KINDS.map((kind) => <option key={kind} value={kind}>{t(MOVEMENT_LABELS[kind])}</option>)}</select></div>
      <div><label htmlFor={`${id}-search`} className="mb-2 block text-xs font-medium">{t("Найти склад")}</label><Input id={`${id}-search`} maxLength={200} placeholder={t("Код или название")} value={search} onChange={function handleSearch(event) { setSearch(event.target.value); }} /><p className="mt-2 text-xs text-muted-foreground">{warehouseLoading ? t("Загрузка складов…") : t`Найдено: ${warehouseCount}. Показано до 100 результатов.`}</p>{lookupError && <p role="alert" className="mt-2 text-xs text-destructive">{t(lookupError)}</p>}</div>
      <div><label htmlFor={`${id}-source`} className="mb-2 block text-xs font-medium">{type === "TRANSFER" ? t("Склад отправления *") : t("Склад *")}</label><select id={`${id}-source`} className="input" value={source?.id ?? ""} onChange={function handleSource(event) { setSource(options.find((warehouse) => warehouse.id === event.target.value) ?? null); }}><option value="">{t("Выберите склад")}</option>{options.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</option>)}</select></div>
      {type === "TRANSFER" && <div><label htmlFor={`${id}-target`} className="mb-2 block text-xs font-medium">{t("Склад назначения *")}</label><select id={`${id}-target`} className="input" value={target?.id ?? ""} onChange={function handleTarget(event) { setTarget(options.find((warehouse) => warehouse.id === event.target.value) ?? null); }}><option value="">{t("Выберите другой склад")}</option>{options.map((warehouse) => <option key={warehouse.id} value={warehouse.id} disabled={warehouse.id === source?.id}>{warehouse.code} · {warehouse.name}</option>)}</select></div>}
      {positionLoading ? <p className="text-xs text-muted-foreground" role="status">{t("Читаем остатки…")}</p> : positions && <div className="rounded-lg border p-3 text-xs text-muted-foreground"><p>{t("Остаток ")}{positions.source.warehouseCode}: <span className="font-mono text-foreground">{formatStockQuantity(positions.source.qty, uiLocale)} {formatUnit(product.unit, uiLocale)}</span></p>{positions.target && <p className="mt-2">{t("Остаток ")}{positions.target.warehouseCode}: <span className="font-mono text-foreground">{formatStockQuantity(positions.target.qty, uiLocale)} {formatUnit(product.unit, uiLocale)}</span></p>}</div>}
      <div><label htmlFor={`${id}-quantity`} className="mb-2 block text-xs font-medium">{type === "ADJUSTMENT" ? t("Корректировка (дельта) *") : t("Количество *")}</label><Input id={`${id}-quantity`} inputMode="decimal" maxLength={22} value={quantity} onChange={function handleQuantity(event) { setQuantity(event.target.value.trim().replace(",", ".")); }} onBlur={handleQuantityBlur} aria-required aria-invalid={Boolean(quantityError)} aria-describedby={`${id}-qty-help ${id}-qty-error`} /><p id={`${id}-qty-error`} role={quantityError ? "alert" : undefined} className="mt-1 text-xs text-destructive">{t(quantityError)}</p><p id={`${id}-qty-help`} className="mt-2 text-xs text-muted-foreground">{type === "ADJUSTMENT" ? t("Положительное число — добавить, отрицательное — списать. Укажите изменение, а не целевой остаток.") : t("Положительное количество, до 3 знаков после точки.")} {t(" Единица: ")}{formatUnit(product.unit, uiLocale)}.</p></div>
      <div><label htmlFor={`${id}-reference`} className="mb-2 block text-xs font-medium">{t("Reference")}</label><Input id={`${id}-reference`} maxLength={128} value={reference} onChange={function handleReference(event) { setReference(event.target.value); }} placeholder={t("Накладная или внутренний документ")} /></div><div><label htmlFor={`${id}-notes`} className="mb-2 block text-xs font-medium">{t("Комментарий")}</label><Textarea id={`${id}-notes`} rows={3} maxLength={1000} value={notes} onChange={function handleNotes(event) { setNotes(event.target.value); }} /></div>
    </fieldset><p className="mt-5 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs leading-relaxed text-muted-foreground">{t("После записи движение неизменяемо. Исправления выполняются новым движением.")}</p>{error && <p role="alert" className="mt-4 text-xs text-destructive">{t(error)}</p>}{blocked && <Button type="button" variant="outline" className="mt-4" onClick={handleClose}>{t("Закрыть и обновить журнал")}</Button>}</div><footer className="border-t px-6 py-4"><p className="mb-4 text-[11px] text-muted-foreground">{t("⌘ / Ctrl + Enter — записать · Esc — закрыть")}</p><div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={handleClose}>{t("Отмена")}</Button><Button type="submit" disabled={busy || blocked || positionLoading || !positions}>{busy && <Spinner />}{t("Записать движение")}</Button></div></footer></form>
  </SheetContent></Sheet>;
}
