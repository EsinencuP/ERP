"use client";
import { useAppFormat } from "@/modules/settings/configuration-provider";
import { useI18n } from "@/i18n/use-i18n";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FileText, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorPanel, EmptyState } from "@/components/ui/feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/hooks/usePermissions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { canWrite } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import type { Result, PaginatedResponse } from "@/types/shared";
import { getInvoices } from "../actions";
import { INVOICE_STATUSES } from "../schema";
import type { Invoice, InvoiceStatus } from "../types";
import { InvoiceFormSheet } from "./invoice-form-sheet";
import { INVOICE_STATUS_LABELS, InvoiceStatusBadge } from "./invoice-presentation";

/** Browse normalized tenant invoices with bounded search/status pagination and create a draft. */
export function InvoiceTable({ initialData }: { initialData: Result<PaginatedResponse<Invoice>> }) {
  const { t , locale: uiLocale } = useI18n();
  const { formatDateOnly } = useAppFormat();

  const router = useRouter(), { role } = usePermissions(), first = useRef(true);
  const [data, setData] = useState(initialData), [search, setSearch] = useState(""), value = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<InvoiceStatus | null>(null), [page, setPage] = useState(1), [revision, setRevision] = useState(0), [loading, setLoading] = useState(false), [create, setCreate] = useState(false);
  useEffect(() => { setPage(1); }, [value, status]);
  useEffect(() => { if (first.current) { first.current = false; return; } let active = true; setLoading(true); getInvoices({ page, search: value, ...(status ? { status } : {}) }).then((result) => { if (active) { if (result.ok && page > Math.max(1, result.data.totalPages)) { setPage(Math.max(1, result.data.totalPages)); return; } setData(result); } }).catch(() => { if (active) setData({ ok: false, error: { code: "STORAGE", message: t("Не удалось загрузить счета") } }); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [page, value, status, revision]);
  function handleRefresh() { setRevision((current) => current + 1); }
  return <div className="motion-fade min-w-0 space-y-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-3 text-muted-foreground">{t("Finance / Invoices")}</p><h1 className="flex items-center gap-3 text-3xl font-semibold"><FileText className="size-6 text-primary" />{t("Счета")}</h1><p className="mt-3 text-sm text-muted-foreground">{t("От черновика до оплаты — строки, налог и PDF в одном месте.")}</p></div>{canWrite(role) && data.ok && <Button disabled={create} onClick={function handleCreate() { setCreate(true); }}><Plus />{t("Новый счёт")}</Button>}</header><div className="relative flex flex-wrap gap-3"><label htmlFor="invoice-search" className="sr-only">{t("Поиск счетов")}</label><Input id="invoice-search" type="search" placeholder={t("Номер или имя клиента")} value={search} maxLength={200} className="max-w-sm" onChange={function handleSearch(event) { setSearch(event.target.value); }} /><label htmlFor="invoice-filter" className="sr-only">{t("Статус счёта")}</label><select id="invoice-filter" className="input w-auto" value={status ?? ""} onChange={function handleStatus(event) { setStatus(INVOICE_STATUSES.find((item) => item === event.target.value) ?? null); }}><option value="">{t("Все статусы")}</option>{INVOICE_STATUSES.map((item) => <option key={item} value={item}>{t(INVOICE_STATUS_LABELS[item])}</option>)}</select><Button size="icon" variant="ghost" disabled={loading} aria-label={t("Обновить счета")} onClick={handleRefresh}><RefreshCw /></Button></div>
    {loading ? <div role="status" aria-label={t("Загрузка счетов")} className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-16 w-full" />)}</div> : !data.ok ? <div><ErrorPanel error={data.error} /><Button className="mt-4" variant="outline" onClick={handleRefresh}>{t("Повторить")}</Button></div> : <div className="panel min-w-0 overflow-hidden"><Table className="min-w-[850px]"><TableHeader><TableRow><TableHead className="p-4">{t("Номер")}</TableHead><TableHead>{t("Клиент")}</TableHead><TableHead>{t("Дата")}</TableHead><TableHead>{t("Оплатить до")}</TableHead><TableHead>{t("Статус")}</TableHead><TableHead className="text-right">{t("Итого")}</TableHead><TableHead className="pr-4 text-right">{t("Остаток")}</TableHead></TableRow></TableHeader><TableBody>{data.data.data.map((invoice) => <TableRow key={invoice.id}><TableCell className="p-4"><Link href={`/finance/${invoice.id}`} className="font-mono text-xs font-medium hover:text-primary hover:underline">{invoice.number}</Link></TableCell><TableCell><span className="block max-w-52 truncate text-xs">{invoice.customer.company || invoice.customer.name}</span></TableCell><TableCell className="text-xs">{formatDateOnly(invoice.issueDate, uiLocale)}</TableCell><TableCell className="text-xs">{formatDateOnly(invoice.dueDate, uiLocale)}</TableCell><TableCell><InvoiceStatusBadge status={invoice.status} /></TableCell><TableCell className="text-right font-mono text-xs tabular-nums">{formatCurrency(invoice.total, invoice.currency, uiLocale)}</TableCell><TableCell className="pr-4 text-right font-mono text-xs tabular-nums">{formatCurrency(invoice.balance, invoice.currency, uiLocale)}</TableCell></TableRow>)}</TableBody></Table>{!data.data.data.length && <EmptyState title={t("Счетов пока нет")} description={t("Создайте черновик или измените фильтр.")} />}<footer className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs text-muted-foreground"><p>{t("Найдено: ")}{data.data.total}</p><div className="flex items-center gap-3"><Button variant="outline" disabled={page <= 1} onClick={function handlePrevious() { setPage((current) => current - 1); }}>{t("Назад")}</Button><span className="font-mono">{page} / {Math.max(1, data.data.totalPages)}</span><Button variant="outline" disabled={page >= data.data.totalPages} onClick={function handleNext() { setPage((current) => current + 1); }}>{t("Далее")}</Button></div></footer></div>}
    {create && canWrite(role) && <InvoiceFormSheet onSaved={function handleSaved(invoice) { setCreate(false); router.push(`/finance/${invoice.id}`); }} onClose={function handleClose() { setCreate(false); }} />}
  </div>;
}
