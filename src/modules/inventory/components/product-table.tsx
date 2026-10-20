"use client";
import { useI18n } from "@/i18n/use-i18n";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Box, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorPanel } from "@/components/ui/feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePermissions } from "@/hooks/usePermissions";
import { canWrite } from "@/lib/permissions";
import { formatCurrency, formatUnit } from "@/lib/utils";
import type { PaginatedResponse, Result } from "@/types/shared";
import { deleteProduct, getProducts } from "../actions";
import { productFiltersSchema, STOCK_STATUSES } from "../schema";
import { formatStockQuantity } from "../stock";
import type { Product, ProductFilters } from "../types";
import { ProductFormSheet } from "./product-form-sheet";
import { STOCK_STATUS_LABELS, StockStatusBadge } from "./product-presentation";

/** Browse normalized products, exact stock totals and per-product thresholds with versioned catalog actions. */
export function ProductTable({ initialData, initialSearch = "" }: { initialData: Result<PaginatedResponse<Product>>; initialSearch?: string }) {
  const { t , locale: uiLocale } = useI18n();

  const router = useRouter(), { role, can } = usePermissions(), first = useRef(true), saving = useRef(false), returnFocus = useRef<HTMLElement | null>(null), createButton = useRef<HTMLButtonElement | null>(null);
  const [data, setData] = useState(initialData), [search, setSearch] = useState(initialSearch), query = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<ProductFilters["stockStatus"]>(), [active, setActive] = useState<"active" | "inactive" | "all">("active");
  const [page, setPage] = useState(1), [revision, setRevision] = useState(0), [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Product | "create" | null>(null), [deleting, setDeleting] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [blocked, setBlocked] = useState(false);
  useEffect(() => { setPage(1); }, [query, status, active]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    let current = true; setLoading(true);
    getProducts({ page, search: query, active, ...(status ? { stockStatus: status } : {}) }).then((result) => {
      if (!current) return;
      if (result.ok && page > Math.max(1, result.data.totalPages)) { setPage(Math.max(1, result.data.totalPages)); return; }
      setData(result);
    }).catch(() => { if (current) setData({ ok: false, error: { code: "STORAGE", message: t("Не удалось загрузить каталог и остатки") } }); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [page, query, status, active, revision]);
  const occupied = form !== null || deleting !== null || busy;
  function handleRefresh() { setRevision((value) => value + 1); router.refresh(); }
  function handleCaptureFocus() { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }
  function handleReturnFocus() { const original = returnFocus.current; if (original?.isConnected && !original.matches(":disabled")) original.focus({ preventScroll: true }); else (createButton.current && !createButton.current.disabled ? createButton.current : document.getElementById("product-search"))?.focus({ preventScroll: true }); }
  function handleCloseForm(needsReload = false) { setForm(null); if (needsReload) handleRefresh(); }
  function handleCloseDelete() { if (saving.current) return; setDeleting(null); if (blocked) handleRefresh(); setBlocked(false); setError(""); }
  async function handleDelete() {
    if (!deleting || saving.current || blocked) return; saving.current = true; setBusy(true); setError("");
    try { const result = await deleteProduct(deleting.id, deleting.version); if (!result.ok) { setError(result.error.message); setBlocked(result.error.code !== "VALIDATION"); toast.error(t(result.error.message)); return; } toast.success(t("Товар удалён")); setDeleting(null); handleRefresh(); }
    catch { const message = t("Результат удаления неизвестен. Закройте окно и обновите каталог перед повтором"); setError(message); setBlocked(true); toast.error(t(message)); }
    finally { saving.current = false; setBusy(false); }
  }
  return <section className="motion-fade min-w-0 space-y-5" aria-labelledby="products-title"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-3">{t("Inventory / Products")}</p><h1 id="products-title" className="flex items-center gap-3 text-3xl font-semibold"><Box className="size-6 text-primary" />{t("Товары и остатки")}</h1><p className="mt-3 text-sm text-muted-foreground">{t("Физический запас по всем складам. Порог пополнения задаётся для каждого товара.")}</p></div>{canWrite(role) && data.ok && <Button ref={createButton} disabled={occupied || loading} onClick={function handleCreate() { handleCaptureFocus(); setForm("create"); }}><Plus />{t("Новый товар")}</Button>}</header>
    <div className="flex flex-wrap items-end gap-3"><div className="w-full sm:max-w-sm"><label htmlFor="product-search" className="mb-1 block text-xs text-muted-foreground">{t("Поиск товаров")}</label><Input id="product-search" type="search" maxLength={200} placeholder={t("SKU, название или категория")} value={search} onChange={function handleSearch(event) { setSearch(event.target.value); }} /></div><div><label htmlFor="product-status-filter" className="mb-1 block text-xs text-muted-foreground">{t("Остаток")}</label><select id="product-status-filter" className="input" value={status ?? ""} onChange={function handleStatus(event) { const parsed = productFiltersSchema.safeParse({ stockStatus: event.target.value }); setStatus(parsed.success ? parsed.data.stockStatus : undefined); }}><option value="">{t("Все статусы")}</option><option value="attention">{t("Требуют пополнения")}</option>{STOCK_STATUSES.map((value) => <option key={value} value={value}>{t(STOCK_STATUS_LABELS[value])}</option>)}</select></div><div><label htmlFor="product-active-filter" className="mb-1 block text-xs text-muted-foreground">{t("Каталог")}</label><select id="product-active-filter" className="input" value={active} onChange={function handleActive(event) { const parsed = productFiltersSchema.safeParse({ active: event.target.value }); if (parsed.success) setActive(parsed.data.active); }}><option value="active">{t("Активные")}</option><option value="inactive">{t("Неактивные")}</option><option value="all">{t("Все товары")}</option></select></div><Button variant="outline" size="icon" disabled={loading || busy} aria-label={t("Обновить товары и остатки")} onClick={handleRefresh}><RefreshCw /></Button></div>
    {loading ? <div role="status" aria-label={t("Загрузка товаров")} className="space-y-3">{[1, 2, 3].map((value) => <Skeleton key={value} className="h-16" />)}</div> : !data.ok ? <ErrorPanel error={data.error} /> : <div className="panel min-w-0 overflow-hidden"><Table className="min-w-[1000px]"><TableHeader><TableRow>{["SKU", "Name", "Category", t("Stock (total)"), t("MinStock"), "Status", "Price", "Actions"].map((label, index) => <TableHead key={label} className={`${index === 0 ? "pl-4" : ""} ${[3, 4, 6, 7].includes(index) ? "text-right" : ""} ${index === 7 ? "pr-4" : ""}`}>{t(label)}</TableHead>)}</TableRow></TableHeader><TableBody>{data.data.data.map((product) => <TableRow key={product.id}><TableCell className="max-w-40 truncate pl-4 font-mono text-xs" title={product.sku}>{product.sku}</TableCell><TableCell><Link href={`/inventory/${product.id}`} className="block max-w-56 truncate rounded text-sm font-medium hover:text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" title={product.name}>{product.name}</Link><p className="mt-1 text-xs text-muted-foreground">{formatUnit(product.unit, uiLocale)}{!product.isActive && t(" · Неактивен")}</p></TableCell><TableCell className="max-w-36 truncate text-xs" title={product.category ?? undefined}>{product.category || "—"}</TableCell><TableCell className="whitespace-nowrap text-right font-mono text-xs tabular-nums">{formatStockQuantity(product.stock, uiLocale)}</TableCell><TableCell className="whitespace-nowrap text-right font-mono text-xs">{formatStockQuantity(product.minStock, uiLocale)}</TableCell><TableCell><StockStatusBadge status={product.stockStatus} /></TableCell><TableCell className="whitespace-nowrap text-right font-mono text-xs">{formatCurrency(product.salePrice, product.currency, uiLocale)}</TableCell><TableCell className="pr-4"><div className="flex justify-end gap-1">{canWrite(role) && <Button variant="ghost" size="icon" disabled={occupied} aria-label={t`Редактировать товар: ${product.name}`} onClick={function handleEdit() { handleCaptureFocus(); setForm(product); }}><Pencil /></Button>}{can("canDelete") && <Button variant="ghost" size="icon" disabled={occupied} aria-label={t`Удалить товар: ${product.name}`} onClick={function handleAskDelete() { setError(""); setBlocked(false); setDeleting(product); }}><Trash2 /></Button>}{!canWrite(role) && <span className="text-xs text-muted-foreground">{t("Просмотр")}</span>}</div></TableCell></TableRow>)}</TableBody></Table>{!data.data.data.length && <EmptyState title={t("Товаров не найдено")} description={t("Добавьте товар или измените поиск и фильтры.")} />}<footer className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs text-muted-foreground"><span>{t("Найдено: ")}{data.data.total}</span><div className="flex items-center gap-3"><Button variant="outline" disabled={page <= 1} onClick={function handlePrevious() { setPage((value) => value - 1); }}>{t("Назад")}</Button><span className="font-mono">{page} / {Math.max(1, data.data.totalPages)}</span><Button variant="outline" disabled={page >= data.data.totalPages} onClick={function handleNext() { setPage((value) => value + 1); }}>{t("Далее")}</Button></div></footer></div>}
    <p className="text-xs leading-relaxed text-muted-foreground">{t("Нет в наличии: 0 · Мало на складе: 0 &lt; запас ≤ MinStock · В наличии: запас &gt; MinStock. Badge в меню учитывает активные товары с низким и нулевым запасом.")}</p>
    {form !== null && canWrite(role) && <ProductFormSheet {...(form !== "create" ? { product: form } : {})} onSaved={function handleSaved() { setForm(null); handleRefresh(); }} onClose={handleCloseForm} onReload={handleRefresh} onReturnFocus={handleReturnFocus} />}
    {deleting && <ConfirmDialog title={t("Удалить товар?")} description={t`«${deleting.name}» будет удалён. Товар с остатками или строками счетов можно только деактивировать.`} busy={busy} disabled={blocked} error={error} onConfirm={handleDelete} onClose={handleCloseDelete} confirmLabel={t("Удалить товар")} />}
  </section>;
}
