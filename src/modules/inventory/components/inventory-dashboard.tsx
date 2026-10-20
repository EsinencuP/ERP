"use client";
import { useI18n } from "@/i18n/use-i18n";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, CircleDollarSign, PackageX, RefreshCw, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorPanel } from "@/components/ui/feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatCurrency, formatUnit } from "@/lib/utils";
import type { Result } from "@/types/shared";
import { getInventoryDashboard } from "../actions";
import { inventoryDashboardFiltersSchema } from "../schema";
import { formatStockQuantity } from "../stock";
import type { InventoryDashboardData, InventoryDashboardFilters } from "../types";
import { StockStatusBadge } from "./product-presentation";

/** Show global inventory KPIs and a paginated low/zero-stock list with explicit replenishment suggestions. */
export function InventoryDashboard({ initialData }: { initialData: Result<InventoryDashboardData> }) {
  const { t , locale: uiLocale, localeTag: uiLocaleTag } = useI18n();

  const router = useRouter(), first = useRef(true);
  const [data, setData] = useState(initialData), [search, setSearch] = useState(""), query = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<InventoryDashboardFilters["stockStatus"]>(), [page, setPage] = useState(1), [revision, setRevision] = useState(0), [loading, setLoading] = useState(false);
  useEffect(() => { setPage(1); }, [query, status]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    let current = true; setLoading(true);
    getInventoryDashboard({ page, search: query, ...(status ? { stockStatus: status } : {}) }).then((result) => { if (!current) return; if (result.ok && page > Math.max(1, result.data.alerts.totalPages)) { setPage(Math.max(1, result.data.alerts.totalPages)); return; } setData(result); }).catch(() => { if (current) setData({ ok: false, error: { code: "STORAGE", message: t("Не удалось загрузить складской обзор") } }); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [page, query, status, revision]);
  function handleRefresh() { setRevision((value) => value + 1); router.refresh(); }
  return <section className="motion-fade min-w-0 space-y-6" aria-labelledby="inventory-dashboard-title">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-3">{t("Inventory / Dashboard")}</p><h1 id="inventory-dashboard-title" className="flex items-center gap-3 text-2xl font-semibold sm:text-3xl"><Boxes className="size-6 text-primary" />{t("Обзор запасов")}</h1><p className="mt-3 text-sm text-muted-foreground">{t("Активные товары и физический запас по всем складам.")}</p></div><Button variant="outline" size="icon" disabled={loading} aria-label={t("Обновить складской обзор")} onClick={handleRefresh}><RefreshCw /></Button></header>
    <div className="flex flex-wrap items-end gap-3"><div className="w-full sm:max-w-sm"><label htmlFor="inventory-alert-search" className="mb-1 block text-xs text-muted-foreground">{t("Поиск товаров для пополнения")}</label><Input id="inventory-alert-search" type="search" maxLength={200} value={search} onChange={function handleSearch(event) { setSearch(event.target.value); }} placeholder={t("SKU, название или категория")} /></div><div><label htmlFor="inventory-alert-status" className="mb-1 block text-xs text-muted-foreground">{t("Статус запаса")}</label><select id="inventory-alert-status" className="input" value={status ?? ""} onChange={function handleStatus(event) { const result = inventoryDashboardFiltersSchema.safeParse({ stockStatus: event.target.value }); setStatus(result.success ? result.data.stockStatus : undefined); }}><option value="">{t("Все требующие пополнения")}</option><option value="low_stock">{t("Мало на складе")}</option><option value="out_of_stock">{t("Нет в наличии")}</option></select></div></div>
    {loading ? <div role="status" aria-label={t("Загрузка складского обзора")} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((key) => <Skeleton key={key} className="h-40" />)}</div><Skeleton className="h-64" /></div> : !data.ok ? <ErrorPanel error={data.error} /> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
        { key: "totalProducts", label: t("Total Products"), count: data.data.kpis.totalProducts, detail: t("Активных товаров в каталоге"), icon: Boxes },
        { key: "lowStockCount", label: t("Low Stock Count"), count: data.data.kpis.lowStockCount, detail: t("Запас больше 0 и не выше MinStock"), icon: TriangleAlert },
        { key: "outOfStock", label: t("Out of Stock"), count: data.data.kpis.outOfStock, detail: t("Товаров с нулевым запасом"), icon: PackageX },
      ].map((metric) => <article key={metric.key} className="motion-fade panel min-w-0 p-5"><div className="flex justify-between gap-2"><h2 className="text-xs text-muted-foreground">{t(metric.label)}</h2><metric.icon className={`size-4 ${metric.key === "lowStockCount" ? "text-warning" : metric.key === "outOfStock" ? "text-danger" : "text-primary"}`} /></div><p data-inventory-kpi={metric.key} className="mt-5 font-mono text-3xl font-semibold">{metric.count}</p><p className="mt-3 text-xs text-muted-foreground">{metric.detail}</p></article>)}
        <article className="motion-fade panel min-w-0 bg-primary/5 p-5"><div className="flex justify-between gap-2"><h2 className="text-xs text-muted-foreground">{t("Total Value")}</h2><CircleDollarSign className="size-4 text-primary" /></div><dl className="mt-4 space-y-2">{(data.data.kpis.totalValues.length ? data.data.kpis.totalValues : [{ currency: "RUB", amount: "0" }]).map((row) => <div key={row.currency}><dt className="text-[10px] text-muted-foreground">{row.currency}</dt><dd data-inventory-value={row.currency} className={`break-words font-mono font-semibold tabular-nums ${row.amount.length >= 17 ? "text-sm" : "text-lg"}`}>{formatCurrency(row.amount, row.currency, uiLocale).replace(/\u00a0/g, " ")}</dd></div>)}</dl><p className="mt-3 text-xs text-muted-foreground">{t("Запас × Price. Цены продажи, валюты отдельно.")}</p></article>
      </div>
      <section className="motion-fade panel min-w-0 overflow-hidden" aria-labelledby="inventory-reorder-title"><header className="p-5"><h2 id="inventory-reorder-title" className="text-sm font-semibold">{t("Требуют пополнения")}</h2><p className="mt-2 text-xs text-muted-foreground">{t("Низкий и нулевой запас. Поиск и фильтр меняют список, KPI учитывают весь активный каталог.")}</p></header><Table className="min-w-[900px]"><TableHeader><TableRow><TableHead className="pl-5">{t("SKU / Товар")}</TableHead><TableHead>{t("Категория")}</TableHead><TableHead className="text-right">{t("Stock (total)")}</TableHead><TableHead className="text-right">{t("MinStock")}</TableHead><TableHead>{t("Статус")}</TableHead><TableHead className="pr-5">{t("Рекомендация")}</TableHead></TableRow></TableHeader><TableBody>{data.data.alerts.data.map((product) => <TableRow key={product.id}><TableCell className="pl-5"><Link href={`/inventory/${product.id}`} className="block max-w-64 truncate rounded text-sm font-medium hover:text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" title={product.name}>{product.name}</Link><p className="mt-1 font-mono text-xs text-muted-foreground">{product.sku} · {formatUnit(product.unit, uiLocale)}</p></TableCell><TableCell className="max-w-40 truncate text-xs" title={product.category ?? undefined}>{product.category || "—"}</TableCell><TableCell className="whitespace-nowrap text-right font-mono text-xs">{formatStockQuantity(product.stock, uiLocale)}</TableCell><TableCell className="whitespace-nowrap text-right font-mono text-xs">{formatStockQuantity(product.minStock, uiLocale)}</TableCell><TableCell><StockStatusBadge status={product.stockStatus} /></TableCell><TableCell className="pr-5"><Badge variant="outline" className="whitespace-nowrap border-warning/30 bg-warning/10 text-warning">{t("Reorder suggested")}</Badge></TableCell></TableRow>)}</TableBody></Table>{!data.data.alerts.total && <EmptyState title={data.data.kpis.totalProducts ? t("Товаров для пополнения не найдено") : t("Каталог пока пуст")} description={data.data.kpis.totalProducts ? t("Измените поиск или статус. Запас проверен по всем складам.") : t("Добавьте товары и зарегистрируйте первое складское движение.")} />}<footer className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs text-muted-foreground"><span>{t("Найдено: ")}{data.data.alerts.total}</span><div className="flex items-center gap-3"><Button variant="outline" disabled={page <= 1} onClick={function handlePrevious() { setPage((value) => value - 1); }}>{t("Назад")}</Button><span className="font-mono">{page} / {Math.max(1, data.data.alerts.totalPages)}</span><Button variant="outline" disabled={page >= data.data.alerts.totalPages} onClick={function handleNext() { setPage((value) => value + 1); }}>{t("Далее")}</Button></div></footer></section>
      <p className="text-xs text-muted-foreground">{t("Обновлено: ")}{new Intl.DateTimeFormat(uiLocaleTag, { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Moscow" }).format(new Date(data.data.asOf))} {t(" (Москва). Стоимость округляется до копеек по товару.")}</p>
    </>}
  </section>;
}
