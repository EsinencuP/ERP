"use client";
import { useI18n } from "@/i18n/use-i18n";


import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { z } from "zod";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type RowSelectionState, type SortingState, type Updater } from "@tanstack/react-table";
import { formatDistanceStrict } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import { ArrowDown, ArrowDownUp, ArrowUp, ChevronLeft, ChevronRight, Download, MoreHorizontal, Pencil, Plus, RefreshCw, Search, Trash2, UserRoundCheck, Users, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { SelectionCheckbox } from "@/components/ui/selection-checkbox";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePermissions } from "@/hooks/usePermissions";
import { downloadCsv } from "@/lib/export";
import { err, ok } from "@/lib/errors";
import { canWrite } from "@/lib/permissions";
import { cn, initials } from "@/lib/utils";
import type { PaginatedResponse, Result } from "@/types/shared";
import { createContact, deleteContacts, getContacts, getContactsForExport, updateContact, updateContactsAssignee } from "../actions";
import { CONTACT_STAGES, contactFiltersSchema } from "../schema";
import type { ContactSelection, ContactTableRow } from "../types";
import { ContactReassignDialog } from "./contact-reassign-dialog";
import { CONTACT_STAGE_LABELS, ContactAssigneeAvatar, ContactStageBadge } from "./contact-presentation";
import { ContactsTableSkeleton } from "./contacts-table-skeleton";
import { ContactFormSheet, type ContactFormValues } from "./contact-form-sheet";

type SelectedContact = ContactSelection & { name: string };
type BulkDialog = { type: "delete" | "reassign"; rows: SelectedContact[] };
type Filters = z.output<typeof contactFiltersSchema>;
const initialFilters: Filters = { page: 1, pageSize: 20, search: "", sort: { field: "createdAt", direction: "desc" } };
const noContacts: ContactTableRow[] = [];

/** Server-paginated contact directory with stable selection, atomic bulk actions and guarded exports. */
export function ContactsTable({ initialData, initialNow }: { initialData: Result<PaginatedResponse<ContactTableRow>>; initialNow: string }) {
  const { t , locale: uiLocale, localeTag: uiLocaleTag } = useI18n();

  const [result, setResult] = useState(initialData);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Record<string, SelectedContact>>({});
  const [dialog, setDialog] = useState<BulkDialog | null>(null);
  const [formContact, setFormContact] = useState<ContactTableRow | "create" | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [now, setNow] = useState(initialNow);
  const firstLoad = useRef(true);
  const formOpenerId = useRef<string | null>(null);
  const { can, role } = usePermissions();
  const mayWrite = canWrite(role);
  const mayDelete = can("canDelete");
  const mayExport = can("canExport");
  const pendingSearch = search.trim() !== (filters.search ?? "");
  const locked = loading || busy || pendingSearch || exporting;
  const rows = result.ok ? result.data.data : noContacts;
  const selection = useMemo<RowSelectionState>(() => Object.fromEntries(Object.keys(selected).map((id) => [id, true])), [selected]);
  const selectedRows = Object.values(selected);

  useEffect(() => { const timer = window.setInterval(() => setNow(new Date().toISOString()), 60_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    const value = debouncedSearch.trim();
    if (value === (filters.search ?? "")) return;
    setSelected({});
    setFilters((current) => ({ ...current, search: value, page: 1 }));
  }, [debouncedSearch, filters.search]);
  useEffect(() => {
    if (firstLoad.current) { firstLoad.current = false; return; }
    let active = true;
    setLoading(true);
    getContacts(filters).then((response) => {
      if (!active) return;
      if (response.ok && response.data.totalPages > 0 && filters.page > response.data.totalPages) {
        setFilters((current) => ({ ...current, page: response.data.totalPages }));
        return;
      }
      if (response.ok && response.data.total === 0 && filters.page !== 1) { setFilters((current) => ({ ...current, page: 1 })); return; }
      setResult(response); setNow(new Date().toISOString());
    }).catch(() => { if (active) setResult({ ok: false, error: { code: "STORAGE", message: t("Не удалось загрузить контакты. Проверьте соединение и повторите запрос") } }); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, revision]);

  function handleSelectionChange(updater: Updater<RowSelectionState>) {
    if (locked) return;
    const next = typeof updater === "function" ? updater(selection) : updater;
    const ids = Object.keys(next).filter((id) => next[id]);
    if (ids.length > 100) { toast.error(t("Можно выбрать до 100 контактов. Снимите часть выбора")); return; }
    const nextSelected: Record<string, SelectedContact> = {};
    for (const id of ids) {
      const previous = selected[id];
      const row = rows.find((contact) => contact.id === id);
      if (previous) nextSelected[id] = previous;
      else if (row) nextSelected[id] = { id: row.id, version: row.version, name: row.name };
    }
    setSelected(nextSelected);
  }
  function handleSortingChange(updater: Updater<SortingState>) {
    const current: SortingState = [{ id: filters.sort.field, desc: filters.sort.direction === "desc" }];
    const next = typeof updater === "function" ? updater(current) : updater;
    const first = next[0];
    if (!first) return;
    const parsed = contactFiltersSchema.safeParse({ ...filters, page: 1, sort: { field: first.id, direction: first.desc ? "desc" : "asc" } });
    if (parsed.success) { setSelected({}); setFilters(parsed.data); }
  }
  function handleOpenBulk(type: BulkDialog["type"], contacts = selectedRows) {
    if (formContact) return;
    setActionError(""); setDialog({ type, rows: contacts });
  }
  function handleRefresh() { setSelected({}); setActionError(""); setRevision((value) => value + 1); }
  async function handleSaveContact(input: ContactFormValues): Promise<Result<true>> {
    if (!formContact || busy || !mayWrite) return err("FORBIDDEN", t("Запись сейчас недоступна"));
    setBusy(true);
    try {
      const saved = formContact === "create" ? await createContact(input) : await updateContact(formContact.id, formContact.version, input);
      if (!saved.ok) return saved;
      setSelected({}); setRevision((value) => value + 1); return ok(true);
    } finally { setBusy(false); }
  }
  async function handleMutation(ownerId?: string | null) {
    if (!dialog || busy) return;
    setBusy(true); setActionError("");
    const targets = dialog.rows.map(({ id, version }) => ({ id, version }));
    try {
      const response = dialog.type === "delete" ? await deleteContacts(targets) : await updateContactsAssignee(targets, ownerId ?? null);
      if (!response.ok) { setActionError(response.error.message); return; }
      toast.success(t(dialog.type === "delete" ? t`Удалено контактов: ${response.data.length}` : t`Назначение обновлено: ${response.data.length}`));
      setDialog(null); setSelected({}); setRevision((value) => value + 1);
    } catch { setActionError(t("Не удалось получить результат операции. Обновите таблицу перед повторной попыткой")); }
    finally { setBusy(false); }
  }
  async function handleExport() {
    if (locked || !mayExport) return;
    setExporting(true); setActionError("");
    try {
      const response = await getContactsForExport(filters, Object.keys(selected));
      if (!response.ok) { setActionError(response.error.message); return; }
      const file = downloadCsv("evo-contacts.csv", [[t("Имя"), t("Компания"), t("Email"), t("Этап"), t("Ответственный"), t("Создан")], ...response.data.map((contact) => [contact.name, contact.company ?? "", contact.email ?? "", t(CONTACT_STAGE_LABELS[contact.stage]), contact.owner?.name ?? "", contact.createdAt])]);
      if (!file.ok) setActionError(file.error.message);
      else toast.success(t`Экспортировано контактов: ${response.data.length}`);
    } catch { setActionError(t("Не удалось выгрузить контакты. Повторите запрос")); }
    finally { setExporting(false); }
  }

  const columns: ColumnDef<ContactTableRow>[] = [
    { id: "select", enableSorting: false, header: ({ table }) => <SelectionCheckbox aria-label={t("Выбрать все контакты на странице")} checked={table.getIsAllPageRowsSelected() && rows.length > 0} indeterminate={table.getIsSomePageRowsSelected()} disabled={locked || !rows.length} onChange={table.getToggleAllPageRowsSelectedHandler()} />, cell: ({ row }) => <SelectionCheckbox aria-label={t`Выбрать ${row.original.name}`} checked={row.getIsSelected()} disabled={locked} onChange={row.getToggleSelectedHandler()} /> },
    { accessorKey: "name", header: t("Имя"), cell: ({ row }) => <Link href={`/crm/contacts/${encodeURIComponent(row.original.id)}`} className="flex max-w-64 items-center gap-3 text-left hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"><Avatar className="size-9 border border-primary/20"><AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">{initials(row.original.name)}</AvatarFallback></Avatar><span className="truncate text-xs font-medium">{row.original.name}</span></Link> },
    { accessorKey: "company", header: t("Компания"), cell: ({ row }) => <span className="block max-w-44 truncate text-xs" title={row.original.company ?? undefined}>{row.original.company || "—"}</span> },
    { accessorKey: "email", header: t("Email"), cell: ({ row }) => row.original.email ? <a className="block max-w-52 truncate text-xs text-muted-foreground hover:text-primary hover:underline" href={`mailto:${row.original.email}`} title={row.original.email}>{row.original.email}</a> : <span className="text-muted-foreground">—</span> },
    { accessorKey: "stage", header: t("Этап"), cell: ({ row }) => <ContactStageBadge stage={row.original.stage} /> },
    { id: "assigned", header: t("Ответственный"), enableSorting: false, cell: ({ row }) => <ContactAssigneeAvatar owner={row.original.owner} /> },
    { accessorKey: "createdAt", header: t("Создан"), cell: ({ row }) => <time className="whitespace-nowrap text-xs text-muted-foreground" dateTime={row.original.createdAt} title={new Intl.DateTimeFormat(uiLocaleTag, { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Moscow" }).format(new Date(row.original.createdAt))}>{formatDistanceStrict(new Date(row.original.createdAt), new Date(now), { addSuffix: true, locale: uiLocale === "ru" ? ru : enUS })}</time> },
    { id: "actions", header: t("Действия"), enableSorting: false, cell: ({ row }) => <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" disabled={locked} id={`contact-actions-${row.original.id}`} aria-label={t`Действия: ${row.original.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link href={`/crm/contacts/${encodeURIComponent(row.original.id)}`}>{t("Открыть контакт")}</Link></DropdownMenuItem>{mayWrite && <DropdownMenuItem disabled={formContact !== null} onSelect={function handleEdit() { formOpenerId.current = `contact-actions-${row.original.id}`; setFormContact(row.original); }}><Pencil />{t("Редактировать контакт")}</DropdownMenuItem>}{mayWrite && <DropdownMenuItem disabled={formContact !== null} onSelect={function handleReassign() { handleOpenBulk("reassign", [{ id: row.original.id, version: row.original.version, name: row.original.name }]); }}><UserRoundCheck />{t("Назначить ответственного")}</DropdownMenuItem>}{mayDelete && <><DropdownMenuSeparator /><DropdownMenuItem disabled={formContact !== null} className="text-destructive focus:text-destructive" onSelect={function handleDelete() { handleOpenBulk("delete", [{ id: row.original.id, version: row.original.version, name: row.original.name }]); }}><Trash2 />{t("Удалить контакт")}</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu> },
  ];
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel(), getRowId: (row) => row.id, manualPagination: true, manualSorting: true, manualFiltering: true, rowCount: result.ok ? result.data.total : 0, enableSortingRemoval: false, enableMultiSort: false, state: { sorting: [{ id: filters.sort.field, desc: filters.sort.direction === "desc" }], rowSelection: selection, pagination: { pageIndex: filters.page - 1, pageSize: filters.pageSize } }, onRowSelectionChange: handleSelectionChange, onSortingChange: handleSortingChange });
  const total = result.ok ? result.data.total : 0;
  const maxPage = result.ok ? Math.max(1, result.data.totalPages) : 1;

  return <div className="motion-fade space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow mb-3 text-muted-foreground">{t("CRM / Адресная книга")}</p><h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight">{t("Контакты")}<span className="rounded-lg border px-2.5 py-1 font-mono text-sm text-muted-foreground" aria-label={t`Найдено контактов: ${total}`}>{result.ok ? total : "—"}</span></h1><p className="mt-3 text-sm text-muted-foreground">{t("Люди и компании, с которыми вы строите отношения.")}</p></div><div className="flex flex-wrap gap-2">{mayWrite && result.ok && <Button disabled={locked || formContact !== null || dialog !== null} id="contact-create-trigger" onClick={function handleCreate() { formOpenerId.current = "contact-create-trigger"; setFormContact("create"); }}><Plus />{t("Новый контакт")}</Button>}{mayExport && <Button variant="outline" disabled={locked || !result.ok} onClick={handleExport} title={t("Выбранные контакты или все по фильтру, до 5000 записей")}><Download />{exporting ? t("Экспорт…") : selectedRows.length ? t`Экспорт выбранных (${selectedRows.length})` : t("Экспорт CSV")}</Button>}</div></header>
    <div className="flex flex-wrap items-end gap-3"><div className="min-w-48 flex-1 sm:max-w-sm"><label className="sr-only" htmlFor="contacts-search">{t("Поиск контактов")}</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><Input id="contacts-search" type="search" placeholder={t("Имя, компания, email или телефон")} value={search} maxLength={200} disabled={busy} onChange={function handleSearch(event) { setSearch(event.target.value); setSelected({}); }} className="pl-10" /></div></div><div><label className="sr-only" htmlFor="contacts-stage">{t("Фильтр этапа")}</label><select id="contacts-stage" className="input motion-fade min-w-40" disabled={busy} value={filters.stage ?? ""} onChange={function handleStage(event) { const parsed = contactFiltersSchema.safeParse({ ...filters, stage: event.target.value || undefined, page: 1 }); if (parsed.success) { setSelected({}); setFilters(parsed.data); } }}><option value="">{t("Все этапы")}</option>{CONTACT_STAGES.map((stage) => <option key={stage} value={stage}>{t(CONTACT_STAGE_LABELS[stage])}</option>)}</select></div><Button variant="ghost" size="icon" aria-label={t("Обновить контакты и сбросить выбор")} title={t("Обновить контакты")} disabled={locked} onClick={handleRefresh}><RefreshCw className={cn(loading && "animate-spin")} /></Button></div>
    {selectedRows.length > 0 && <div className="motion-fade flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3" role="region" aria-label={t("Действия с выбранными контактами")}><p className="mr-auto text-xs font-medium" role="status">{t("Выбрано: ")}{selectedRows.length} / 100</p>{mayWrite && <Button variant="outline" size="sm" disabled={locked || formContact !== null} onClick={function handleBulkAssign() { handleOpenBulk("reassign"); }}><UserRoundCheck />{t("Назначить")}</Button>}{mayDelete && <Button variant="destructive" size="sm" disabled={locked || formContact !== null} onClick={function handleBulkDelete() { handleOpenBulk("delete"); }}><Trash2 />{t("Удалить")}</Button>}<Button variant="ghost" size="icon" disabled={busy} aria-label={t("Снять выбор контактов")} onClick={function handleClearSelection() { setSelected({}); }}><X /></Button></div>}
    {actionError && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">{actionError}</p>}
    <div aria-busy={loading || pendingSearch}>
      {loading ? <ContactsTableSkeleton /> : !result.ok ? <div role="alert" className="motion-fade panel p-8"><Users className="mb-4 size-6 text-muted-foreground" /><h2 className="text-lg font-medium">{result.error.code === "CONFIGURATION" ? t("Контакты доступны в подключённом рабочем пространстве") : t("Не удалось загрузить контакты")}</h2><p className="mt-3 max-w-xl text-sm text-muted-foreground">{t(result.error.code === "CONFIGURATION" ? t("Деморежим содержит учебные сделки. Для работы с контактами войдите в рабочее пространство с подключённой базой данных.") : result.error.message)}</p><Button className="mt-5" variant="outline" onClick={handleRefresh}>{t("Повторить загрузку")}</Button></div> : <div className="panel overflow-hidden"><Table className="min-w-[1080px]"><TableCaption className="sr-only">{t("Контакты рабочего пространства. Выбор по идентификаторам сохраняется между страницами, до 100 записей.")}</TableCaption><TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header) => <TableHead key={header.id} scope="col" className={cn("px-5 text-[11px]", header.id === "select" && "w-12", header.id === "actions" && "text-right")} aria-sort={header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : undefined}>{header.column.getCanSort() ? <button className="flex items-center gap-2 whitespace-nowrap py-4 hover:text-foreground" disabled={locked} onClick={header.column.getToggleSortingHandler()}>{flexRender(header.column.columnDef.header, header.getContext())}{header.column.getIsSorted() === "asc" ? <ArrowUp className="size-3" /> : header.column.getIsSorted() === "desc" ? <ArrowDown className="size-3" /> : <ArrowDownUp className="size-3 opacity-50" />}</button> : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader><TableBody>{table.getRowModel().rows.map((row) => <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id} className={cn("px-5 py-4", cell.column.id === "actions" && "text-right")}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)}</TableBody></Table>{!rows.length && <EmptyState title={filters.search || filters.stage ? t("Контакты не найдены") : t("Пока нет контактов")} description={filters.search || filters.stage ? t("Попробуйте другой запрос или выберите все этапы.") : t("Здесь появятся контакты вашего рабочего пространства.")} />}<footer className="flex flex-wrap items-center justify-between gap-4 border-t px-5 py-4"><p className="text-xs text-muted-foreground" role="status">{total ? t`${(filters.page - 1) * filters.pageSize + 1}–${(filters.page - 1) * filters.pageSize + rows.length} из ${total}` : t("0 контактов")}</p><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs text-muted-foreground">{t("На странице")}<select className="input h-8 w-16 px-2" aria-label={t("Контактов на странице")} value={filters.pageSize} disabled={locked} onChange={function handlePageSize(event) { setFilters((current) => ({ ...current, page: 1, pageSize: Number(event.target.value) })); }}>{[20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label><Button variant="outline" size="icon" aria-label={t("Предыдущая страница контактов")} disabled={locked || filters.page <= 1} onClick={function handlePreviousPage() { setFilters((current) => ({ ...current, page: current.page - 1 })); }}><ChevronLeft /></Button><span className="font-mono text-xs text-muted-foreground">{filters.page} / {maxPage}</span><Button variant="outline" size="icon" aria-label={t("Следующая страница контактов")} disabled={locked || filters.page >= maxPage} onClick={function handleNextPage() { setFilters((current) => ({ ...current, page: current.page + 1 })); }}><ChevronRight /></Button></div></footer></div>}
    </div>
    {formContact !== null && mayWrite && <ContactFormSheet {...(formContact === "create" ? {} : { contact: formContact })} disabled={busy} onSave={handleSaveContact} onClose={function handleCloseForm() { setFormContact(null); }} onReload={handleRefresh} onReturnFocus={function handleFormReturnFocus() { const target = formOpenerId.current ? document.getElementById(formOpenerId.current) : null; (target ?? document.getElementById("contacts-search"))?.focus({ preventScroll: true }); }} />}
    {dialog?.type === "delete" && <ConfirmDialog title={t`Удалить контакты: ${dialog.rows.length}?`} description={t("Удаление нельзя отменить. Контакты со связанными сделками, активностями или документами не удаляются; при конфликте вся выборка останется без изменений.")} confirmLabel={t`Удалить (${dialog.rows.length})`} busy={busy} error={actionError} onConfirm={function handleDeleteConfirm() { void handleMutation(); }} onClose={function handleCloseDelete() { setDialog(null); setActionError(""); }} />}
    {dialog?.type === "reassign" && <ContactReassignDialog count={dialog.rows.length} busy={busy} error={actionError} onConfirm={function handleReassignConfirm(ownerId) { void handleMutation(ownerId); }} onClose={function handleCloseReassign() { setDialog(null); setActionError(""); }} />}
  </div>;
}
