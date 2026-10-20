"use client";
import { useI18n } from "@/i18n/use-i18n";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, ReceiptText, RefreshCw, Trash2 } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils";
import type { PaginatedResponse, Result } from "@/types/shared";
import { deleteExpense, getExpenses } from "../actions";
import { EXPENSE_CATEGORIES, FINANCE_CURRENCIES, expenseCategorySchema, financeCurrencySchema } from "../schema";
import type { Expense, ExpenseCategory, FinanceCurrency } from "../types";
import { ExpenseDetailDialog } from "./expense-detail-dialog";
import { ExpenseFormSheet } from "./expense-form-sheet";
import { EXPENSE_CATEGORY_LABELS, ExpenseReceiptLink } from "./expense-presentation";

/** Browse workspace expenses with category filtering, versioned CRUD, and explicit failure/empty states. */
export function ExpenseTable({ initialData, initialProjectId = "" }: { initialData: Result<PaginatedResponse<Expense>>; initialProjectId?: string }) {
  const { t , locale: uiLocale } = useI18n();

  const { role, can } = usePermissions(), first = useRef(true), saving = useRef(false), returnFocus = useRef<HTMLElement | null>(null), createButton = useRef<HTMLButtonElement | null>(null);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [data, setData] = useState(initialData), [search, setSearch] = useState(""), query = useDebouncedValue(search, 300);
  const [category, setCategory] = useState<ExpenseCategory | null>(null), [currency, setCurrency] = useState<FinanceCurrency | null>(null);
  const [page, setPage] = useState(1), [revision, setRevision] = useState(0), [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Expense | "create" | null>(null), [detail, setDetail] = useState<Expense | null>(null), [deleting, setDeleting] = useState<Expense | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [blocked, setBlocked] = useState(false);
  useEffect(() => { setPage(1); }, [query, category, currency, projectId]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    let active = true; setLoading(true);
    getExpenses({ page, search: query, ...(projectId ? { projectId } : {}), ...(category ? { category } : {}), ...(currency ? { currency } : {}) }).then((result) => {
      if (!active) return;
      if (result.ok && page > Math.max(1, result.data.totalPages)) { setPage(Math.max(1, result.data.totalPages)); return; }
      setData(result);
    }).catch(() => { if (active) setData({ ok: false, error: { code: "STORAGE", message: t("Не удалось загрузить расходы") } }); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, query, category, currency, revision, projectId]);
  const occupied = form !== null || detail !== null || deleting !== null || busy;
  function handleRefresh() { setRevision((value) => value + 1); }
  function handleCaptureFocus() { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }
  function handleReturnFocus() {
    const original = returnFocus.current;
    if (original?.isConnected && !original.matches(":disabled")) { original.focus({ preventScroll: true }); return; }
    const target = createButton.current && !createButton.current.disabled ? createButton.current : document.getElementById("expense-search");
    target?.focus({ preventScroll: true });
  }
  function handleCloseForm(needsReload = false) { setForm(null); if (needsReload) handleRefresh(); }
  function handleCloseDelete() { if (saving.current) return; setDeleting(null); if (blocked) handleRefresh(); setBlocked(false); setError(""); }
  async function handleDelete() {
    if (!deleting || saving.current || blocked) return; saving.current = true; setBusy(true); setError("");
    try {
      const result = await deleteExpense(deleting.id, deleting.version);
      if (!result.ok) { setError(t`${result.error.message}. Закройте окно и обновите данные перед повтором.`); setBlocked(result.error.code !== "VALIDATION"); toast.error(t(result.error.message)); return; }
      toast.success(t("Расход удалён")); setDeleting(null); handleRefresh();
    } catch { const message = t("Результат удаления неизвестен. Закройте окно и обновите расходы перед повтором"); setError(message); setBlocked(true); toast.error(t(message)); }
    finally { saving.current = false; setBusy(false); }
  }
  return <div className="motion-fade min-w-0 space-y-5"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-3 text-muted-foreground">{t("Finance / Expenses")}</p><h1 className="flex items-center gap-3 text-3xl font-semibold"><ReceiptText className="size-6 text-primary" />{t("Расходы")}</h1><p className="mt-3 text-sm text-muted-foreground">{t("Затраты по категориям, чеки и комментарии.")}</p></div>{canWrite(role) && data.ok && <Button ref={createButton} disabled={occupied || loading} onClick={function handleCreate() { handleCaptureFocus(); setForm("create"); }}><Plus />{t("Новый расход")}</Button>}</header>
    {projectId && <div className="motion-fade flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-xs"><Link href={`/projects/overview?projectId=${projectId}`} className="text-primary hover:underline">{t("Расходы выбранного проекта · К обзору")}</Link><Button variant="ghost" disabled={occupied || loading} onClick={function handleAllExpenses() { setProjectId(""); }}>{t("Все расходы")}</Button></div>}
    <div className="relative flex flex-wrap items-end gap-3"><div className="w-full sm:max-w-sm"><label htmlFor="expense-search" className="mb-1 block text-xs text-muted-foreground">{t("Поиск расходов")}</label><Input id="expense-search" type="search" maxLength={200} placeholder={t("Название или комментарий")} value={search} onChange={function handleSearch(event) { setSearch(event.target.value); }} /></div><div className="min-w-0"><label htmlFor="expense-category-filter" className="mb-1 block text-xs text-muted-foreground">{t("Категория")}</label><select id="expense-category-filter" className="input w-full" value={category ?? ""} onChange={function handleCategory(event) { const parsed = expenseCategorySchema.safeParse(event.target.value); setCategory(parsed.success ? parsed.data : null); }}><option value="">{t("Все категории")}</option>{EXPENSE_CATEGORIES.map((value) => <option key={value} value={value}>{t(EXPENSE_CATEGORY_LABELS[value])}</option>)}</select></div><div><label htmlFor="expense-currency-filter" className="mb-1 block text-xs text-muted-foreground">{t("Валюта")}</label><select id="expense-currency-filter" className="input w-full" value={currency ?? ""} onChange={function handleCurrency(event) { const parsed = financeCurrencySchema.safeParse(event.target.value); setCurrency(parsed.success ? parsed.data : null); }}><option value="">{t("Все валюты")}</option>{FINANCE_CURRENCIES.map((value) => <option key={value}>{value}</option>)}</select></div><Button variant="outline" size="icon" disabled={loading || busy} aria-label={t("Обновить расходы")} onClick={handleRefresh}><RefreshCw /></Button></div>
    {loading ? <div role="status" aria-label={t("Загрузка расходов")} className="space-y-3">{[1, 2, 3].map((value) => <Skeleton key={value} className="h-16" />)}</div> : !data.ok ? <ErrorPanel error={data.error} /> : <section className="panel min-w-0 overflow-hidden"><Table className="min-w-[820px]"><TableHeader><TableRow><TableHead className="pl-4">{t("Название")}</TableHead><TableHead>{t("Дата")}</TableHead><TableHead>{t("Категория")}</TableHead><TableHead className="text-right">{t("Сумма")}</TableHead><TableHead>{t("Чек")}</TableHead><TableHead className="pr-4 text-right">{t("Действия")}</TableHead></TableRow></TableHeader><TableBody>{data.data.data.map((expense) => <TableRow key={expense.id}><TableCell className="pl-4"><button type="button" disabled={occupied} aria-label={t`Открыть расход: ${expense.title}`} className="max-w-64 truncate rounded text-left text-sm font-medium hover:text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50" title={expense.title} onClick={function handleDetail() { setDetail(expense); }}>{expense.title}</button>{expense.notes && <p className="mt-1 max-w-64 truncate text-xs text-muted-foreground">{expense.notes}</p>}</TableCell><TableCell className="whitespace-nowrap font-mono text-xs">{expense.date}</TableCell><TableCell className="text-xs">{t(EXPENSE_CATEGORY_LABELS[expense.category])}</TableCell><TableCell className="text-right font-mono text-xs tabular-nums">{formatCurrency(expense.amount, expense.currency, uiLocale)}</TableCell><TableCell><ExpenseReceiptLink receipt={expense.receipt} /></TableCell><TableCell className="pr-4 text-right"><div className="flex justify-end gap-1">{canWrite(role) && <Button size="icon" variant="ghost" disabled={occupied} aria-label={t`Редактировать расход: ${expense.title}`} onClick={function handleEdit() { handleCaptureFocus(); setForm(expense); }}><Pencil /></Button>}{can("canDelete") && <Button size="icon" variant="ghost" disabled={occupied} aria-label={t`Удалить расход: ${expense.title}`} onClick={function handleAskDelete() { setError(""); setBlocked(false); setDeleting(expense); }}><Trash2 /></Button>}{!canWrite(role) && <span className="text-xs text-muted-foreground">{t("Просмотр")}</span>}</div></TableCell></TableRow>)}</TableBody></Table>{!data.data.data.length && <EmptyState title={t("Расходов не найдено")} description={t("Добавьте расход или измените фильтр категории.")} />}<footer className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs text-muted-foreground"><span>{t("Найдено: ")}{data.data.total}</span><div className="flex items-center gap-3"><Button variant="outline" disabled={page <= 1} onClick={function handlePrevious() { setPage((value) => value - 1); }}>{t("Назад")}</Button><span className="font-mono">{page} / {Math.max(1, data.data.totalPages)}</span><Button variant="outline" disabled={page >= data.data.totalPages} onClick={function handleNext() { setPage((value) => value + 1); }}>{t("Далее")}</Button></div></footer></section>}
    {form !== null && canWrite(role) && <ExpenseFormSheet initialProjectId={projectId} {...(form !== "create" ? { expense: form } : {})} onSaved={function handleSaved() { setForm(null); handleRefresh(); }} onClose={handleCloseForm} onReload={handleRefresh} onReturnFocus={handleReturnFocus} />}
    {detail && <ExpenseDetailDialog expense={detail} onClose={function handleCloseDetail() { setDetail(null); }} />}
    {deleting && <ConfirmDialog title={t("Удалить расход?")} description={t`«${deleting.title}» будет удалён из реестра. История изменений сохранится в журнале.`} busy={busy} disabled={blocked} error={error} onConfirm={handleDelete} onClose={handleCloseDelete} confirmLabel={t("Удалить расход")} />}
  </div>;
}
