"use client";
import { useAppFormat } from "@/modules/settings/configuration-provider";
import { useI18n } from "@/i18n/use-i18n";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RefreshCw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorPanel } from "@/components/ui/feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePermissions } from "@/hooks/usePermissions";
import { canWrite } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import type { PaginatedResponse, Result } from "@/types/shared";
import { getPayments } from "../actions";
import { FINANCE_CURRENCIES, PAYMENT_METHODS, financeCurrencySchema, invoicePaymentSchema } from "../schema";
import type { FinanceCurrency, InvoicePaymentInput, PaymentRow } from "../types";
import { INVOICE_PAYMENT_METHOD_LABELS } from "./invoice-presentation";
import { RecordPaymentDialog } from "./record-payment-dialog";

/** Browse exact normalized receipts with server-side filters/pagination and record an allocated payment. */
export function PaymentTable({ initialData }: { initialData: Result<PaginatedResponse<PaymentRow>> }) {
  const { t , locale: uiLocale, localeTag: uiLocaleTag } = useI18n();
  const { formatDateTime } = useAppFormat();

  const { role } = usePermissions(), first = useRef(true);
  const [data, setData] = useState(initialData), [search, setSearch] = useState(""), query = useDebouncedValue(search, 300);
  const [currency, setCurrency] = useState<FinanceCurrency | null>(null), [method, setMethod] = useState<InvoicePaymentInput["method"] | null>(null);
  const [from, setFrom] = useState(""), [to, setTo] = useState(""), [page, setPage] = useState(1), [revision, setRevision] = useState(0), [loading, setLoading] = useState(false), [recording, setRecording] = useState(false);
  useEffect(() => { setPage(1); }, [query, currency, method, from, to]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    let active = true; setLoading(true);
    getPayments({ page, search: query, ...(currency ? { currency } : {}), ...(method ? { method } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) }).then((result) => { if (!active) return; if (result.ok && page > Math.max(1, result.data.totalPages)) { setPage(Math.max(1, result.data.totalPages)); return; } setData(result); }).catch(() => { if (active) setData({ ok: false, error: { code: "STORAGE", message: t("Не удалось загрузить платежи") } }); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, query, currency, method, from, to, revision]);
  function handleRefresh() { setRevision((value) => value + 1); }
  return <div className="motion-fade min-w-0 space-y-5"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-3 text-muted-foreground">{t("Finance / Payments")}</p><h1 className="flex items-center gap-3 text-3xl font-semibold"><Wallet className="size-6 text-primary" />{t("Платежи")}</h1><p className="mt-3 text-sm text-muted-foreground">{t("Поступления по счетам и история частичной оплаты. Даты фильтра — в часовом поясе компании.")}</p></div>{canWrite(role) && data.ok && <Button disabled={recording} onClick={function handleRecord() { setRecording(true); }}><Wallet />{t("Записать оплату")}</Button>}</header>
    <div className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_auto_auto_auto_auto_auto]"><div><label htmlFor="payment-search" className="mb-1 block text-xs text-muted-foreground">{t("Счёт, клиент или код платежа")}</label><Input id="payment-search" type="search" maxLength={200} placeholder={t("Поиск платежей")} value={search} onChange={function handleSearch(event) { setSearch(event.target.value); }} /></div><div><label htmlFor="payment-currency" className="mb-1 block text-xs text-muted-foreground">{t("Валюта")}</label><select id="payment-currency" className="input w-full" value={currency ?? ""} onChange={function handleCurrency(event) { const parsed = financeCurrencySchema.safeParse(event.target.value); setCurrency(parsed.success ? parsed.data : null); }}><option value="">{t("Все валюты")}</option>{FINANCE_CURRENCIES.map((code) => <option key={code}>{code}</option>)}</select></div><div><label htmlFor="payment-method" className="mb-1 block text-xs text-muted-foreground">{t("Способ")}</label><select id="payment-method" className="input w-full" value={method ?? ""} onChange={function handleMethod(event) { const parsed = invoicePaymentSchema.shape.method.safeParse(event.target.value); setMethod(parsed.success ? parsed.data : null); }}><option value="">{t("Все способы")}</option>{PAYMENT_METHODS.map((value) => <option key={value} value={value}>{t(INVOICE_PAYMENT_METHOD_LABELS[value])}</option>)}</select></div><div className="min-w-0"><label htmlFor="payment-from" className="mb-1 block text-xs text-muted-foreground">{t("С даты")}</label><Input id="payment-from" type="date" value={from} onChange={function handleFrom(event) { setFrom(event.target.value); }} /></div><div className="min-w-0"><label htmlFor="payment-to" className="mb-1 block text-xs text-muted-foreground">{t("По дату")}</label><Input id="payment-to" type="date" value={to} onChange={function handleTo(event) { setTo(event.target.value); }} /></div><Button variant="outline" size="icon" className="self-end" disabled={loading} aria-label={t("Обновить платежи")} onClick={handleRefresh}><RefreshCw /></Button></div>
    {loading ? <div role="status" aria-label={t("Загрузка платежей")} className="space-y-3">{[1, 2, 3].map((value) => <Skeleton key={value} className="h-16" />)}</div> : !data.ok ? <ErrorPanel error={data.error} /> : <section className="panel min-w-0 overflow-hidden"><Table className="min-w-[960px]"><TableHeader><TableRow><TableHead className="pl-4">{t("Дата получения")}</TableHead><TableHead>{t("Счёт / клиент")}</TableHead><TableHead>{t("Способ")}</TableHead><TableHead>{t("Код / комментарий")}</TableHead><TableHead>{t("Зарегистрировал")}</TableHead><TableHead className="pr-4 text-right">{t("Сумма")}</TableHead></TableRow></TableHeader><TableBody>{data.data.data.map((payment) => <TableRow key={payment.id}><TableCell className="pl-4 font-mono text-xs">{formatDateTime(new Date(payment.receivedAt))}</TableCell><TableCell><Link href={`/finance/${payment.invoiceId}`} className="font-mono text-xs text-primary hover:underline">{payment.invoiceNumber}</Link><p className="mt-1 max-w-48 truncate text-xs text-muted-foreground" title={payment.customerName}>{payment.customerName}</p></TableCell><TableCell className="text-xs">{t(INVOICE_PAYMENT_METHOD_LABELS[payment.method] ?? payment.method)}</TableCell><TableCell><p className="max-w-52 truncate font-mono text-[11px]" title={payment.reference}>{payment.reference}</p>{payment.notes && <p className="mt-1 max-w-52 truncate text-xs text-muted-foreground" title={payment.notes}>{payment.notes}</p>}</TableCell><TableCell className="text-xs">{payment.receivedBy ?? "—"}</TableCell><TableCell className="pr-4 text-right font-mono text-xs tabular-nums">{formatCurrency(payment.amount, payment.currency, uiLocale)}</TableCell></TableRow>)}</TableBody></Table>{!data.data.data.length && <EmptyState title={t("Платежей не найдено")} description={t("Измените фильтры или зарегистрируйте поступление по выданному счёту.")} />}<footer className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs text-muted-foreground"><span>{t("Найдено: ")}{data.data.total}</span><div className="flex items-center gap-3"><Button variant="outline" disabled={page <= 1} onClick={function handlePrevious() { setPage((value) => value - 1); }}>{t("Назад")}</Button><span className="font-mono">{page} / {Math.max(1, data.data.totalPages)}</span><Button variant="outline" disabled={page >= data.data.totalPages} onClick={function handleNext() { setPage((value) => value + 1); }}>{t("Далее")}</Button></div></footer></section>}
    {recording && canWrite(role) && <RecordPaymentDialog onClose={function handleClose() { setRecording(false); }} onSaved={handleRefresh} />}
  </div>;
}
