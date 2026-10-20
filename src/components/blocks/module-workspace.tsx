"use client";
import { useI18n } from "@/i18n/use-i18n";


import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownToLine, ArrowUpRight, CheckCircle2, Columns3, List, Plus, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import type { RowSelectionState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/blocks/data-table";
import { KanbanBoard } from "@/components/blocks/kanban-board";
import { RecordForm } from "@/components/blocks/record-form";
import { PaymentForm } from "@/modules/finance/components/payment-form";
import { actions } from "@/lib/client-actions";
import { failure } from "@/lib/errors";
import { modules } from "@/lib/modules";
import { money } from "@/lib/utils";
import { downloadCsv } from "@/lib/export";
import { getExportDocuments } from "@/lib/export-actions";
import { usePermissions } from "@/hooks/usePermissions";
import { canWrite as canWriteRole } from "@/lib/permissions";
import type { DocumentRecord, Domain, RecordData, SessionContext, WorkspaceState } from "@/types/shared";

/** Compose a domain workspace with real CRUD, export, search, filters and a versioned kanban. */
export function ModuleWorkspace({ domain, initialState, session }: { domain: Domain; initialState: WorkspaceState; session: SessionContext }) {
  const { t , locale: uiLocale } = useI18n();

  const router = useRouter();
  const searchParams = useSearchParams();
  const definition = modules[domain];
  const [state, setState] = useState(initialState);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"table" | "board">("table");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentRecord | null>(null);
  const [deleting, setDeleting] = useState<DocumentRecord | null>(null);
  const [paying, setPaying] = useState<DocumentRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selection, setSelection] = useState<RowSelectionState>({});
  const { role, can } = usePermissions();
  const canWrite = canWriteRole(role);

  useEffect(() => { setState(initialState); }, [initialState]);
  useEffect(() => { setQuery(searchParams.get("q") ?? ""); if (searchParams.get("create") === "1" && canWrite) { setEditing(null); setFormOpen(true); router.replace(`/${domain}`); } }, [domain, canWrite, searchParams, router]);

  const rows = state.documents.filter((row) => row.domain === domain);
  const filtered = rows.filter((row) => (status === "all" || row.data.status === status) && `${row.data.title} ${row.data.subtitle} ${row.data.email}`.toLowerCase().includes(query.toLowerCase()));
  const total = rows.reduce((sum, row) => sum + row.data.amount * (domain === "inventory" ? row.data.quantity : 1), 0);
  const open = rows.filter((row) => !["Завершён", "Оплачен", "Выиграна", "Проиграна", "Неактивен", "Нет в наличии"].includes(row.data.status));
  const receiptTotal = state.payments.reduce((sum, row) => sum + row.amount, 0);
  const stats = domain === "finance" ? [{ label: t("Выставлено счетов"), value: money(total, undefined, uiLocale) }, { label: t("Получено оплат"), value: money(receiptTotal, undefined, uiLocale) }, { label: t("Остаток по счетам"), value: money(rows.filter((row) => row.data.status !== "Черновик").reduce((sum, row) => sum + row.data.amount, 0) - receiptTotal, undefined, uiLocale) }] : domain === "inventory" ? [{ label: t("Позиций в каталоге"), value: String(rows.length).padStart(2, "0") }, { label: t("Стоимость остатков"), value: money(total, undefined, uiLocale) }, { label: t("Требуют пополнения"), value: String(rows.filter((row) => row.data.quantity <= 3).length).padStart(2, "0") }] : domain === "hr" ? [{ label: t("Всего сотрудников"), value: String(rows.length).padStart(2, "0") }, { label: t("Сейчас работают"), value: String(rows.filter((row) => row.data.status === "Работает").length).padStart(2, "0") }, { label: t("В отпуске"), value: String(rows.filter((row) => row.data.status === "В отпуске").length).padStart(2, "0") }] : [{ label: domain === "crm" ? t("Сделок в воронке") : t("Всего проектов"), value: String(rows.length).padStart(2, "0") }, { label: domain === "crm" ? t("Потенциал сделок") : t("Общий бюджет"), value: money(total, undefined, uiLocale) }, { label: domain === "crm" ? t("Активные возможности") : t("В работе"), value: String(open.length).padStart(2, "0") }];

  function handleRecordSaved(record: DocumentRecord) { setState((current) => ({ ...current, documents: [record, ...current.documents.filter((row) => row.id !== record.id)] })); setMessage(t("Изменения сохранены")); setError(""); router.refresh(); }
  function handleRowEdit(record: DocumentRecord) { setEditing(record); setFormOpen(true); }
  function handleRowDelete(record: DocumentRecord) { setDeleting(record); setDeleteError(""); }
  function handleCreate() { setEditing(null); setFormOpen(true); }

  async function handleSave(data: RecordData) {
    try { const result = editing ? await actions[domain].update(editing.id, editing.version, data) : await actions[domain].create(data); if (result.ok) handleRecordSaved(result.data); return result; }
    catch { return failure<DocumentRecord>("STORAGE", t("Связь с сервером прервана. Обновите страницу")); }
  }
  async function handleDeleteConfirm() {
    if (!deleting) return;
    setBusy(true); setDeleteError("");
    try {
      const result = await actions[domain].delete(deleting.id, deleting.version);
      if (!result.ok) { setDeleteError(result.error.message); return; }
      setState((current) => ({ ...current, documents: current.documents.filter((row) => row.id !== deleting.id) }));
      setSelection((current) => { const next = { ...current }; delete next[deleting.id]; return next; });
      setDeleting(null); setMessage(t("Запись удалена")); router.refresh();
    } catch { setDeleteError(t("Связь с сервером прервана. Обновите страницу")); } finally { setBusy(false); }
  }
  async function handleStageMove(record: DocumentRecord, nextStatus: string) {
    if (busy) return;
    setBusy(true); setError("");
    try { const result = await actions[domain].update(record.id, record.version, { ...record.data, status: nextStatus }); if (result.ok) handleRecordSaved(result.data); else setError(result.error.message); }
    catch { setError(t("Не удалось изменить этап. Обновите страницу")); } finally { setBusy(false); }
  }
  async function handleExport() {
    if (!can("canExport")) return;
    try {
    const selected = filtered.filter((row) => selection[row.id]);
    const requestedRows = selected.length ? selected : filtered;
    const exported = await getExportDocuments(domain, requestedRows.map((row) => row.id));
    if (!exported.ok) { setError(exported.error.message); return; }
    const exportRows = exported.data;
    const result = downloadCsv(`evo-${domain}.csv`, [[t(definition.primaryLabel), t(definition.secondaryLabel), t("Статус"), `${t(definition.amountLabel)}, €`, t("Количество"), t("Email"), t("Дата"), t("Готовность, %"), t("Комментарий")], ...exportRows.map((row) => [row.data.title, row.data.subtitle, t(row.data.status), row.data.amount / 100, row.data.quantity, row.data.email, row.data.date, row.data.progress, row.data.notes])]);
    if (!result.ok) setError(result.error.message); else setMessage(t`Экспортировано записей: ${exportRows.length}`);
    } catch { setError(t("Не удалось получить данные для экспорта. Повторите попытку")); }
  }
  return <div className="space-y-6"><div className="motion flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow mb-2">{t("РАБОЧЕЕ ПРОСТРАНСТВО / ")}{t(definition.title)}</div><h1 className="page-title">{t(definition.title)}<span className="text-[hsl(var(--color-primary))]">.</span></h1><p className="muted mt-2 text-xs">{t(definition.description)}</p></div><div className="flex gap-2">{can("canExport") && <Button variant="outline" onClick={handleExport}><ArrowDownToLine />{t("Экспорт")}</Button>}{canWrite && <Button onClick={handleCreate}><Plus />{t("Добавить ")}{t(definition.singular)}</Button>}</div></div>
    <div className="grid gap-4 sm:grid-cols-3">{stats.map((stat, index) => <div key={stat.label} className="panel p-5" style={{ animationDelay: `${index * 50}ms` }}><p className="mb-4 flex items-center justify-between text-[11px] muted">{t(stat.label)}<ArrowUpRight className="size-3.5" /></p><p className="font-mono text-[26px] font-medium tracking-[-.05em]">{stat.value}</p></div>)}</div>
    {(message || error) && <div role={error ? "alert" : "status"} className={`motion flex items-center gap-2 rounded-xl border px-4 py-3 text-xs ${error ? "bg-[hsl(var(--color-danger-soft))] text-[hsl(var(--color-danger))]" : "bg-[hsl(var(--color-success-soft))] text-[hsl(var(--color-success))]"}`}><CheckCircle2 className="size-3.5" />{t(error || message)}<button className="ml-auto p-1" aria-label={t("Закрыть сообщение")} onClick={function handleDismiss() { setError(""); setMessage(""); }}><X className="size-3.5" /></button></div>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-1 flex-wrap gap-3"><div className="relative min-w-[180px] max-w-xs flex-1"><Search className="absolute left-3 top-3 size-3.5 muted" /><input className="input pl-9" aria-label={t`Поиск: ${t(definition.title)}`} placeholder={t("Найти запись...")} value={query} onChange={function handleSearch(event) { setQuery(event.target.value); setSelection({}); }} /></div><div className="relative"><SlidersHorizontal className="pointer-events-none absolute left-3 top-3.5 size-3 muted" /><select className="input min-w-[165px] pl-8 !text-xs" value={status} aria-label={t("Фильтр по статусу")} onChange={function handleStatusFilter(event) { setStatus(event.target.value); setSelection({}); }}><option value="all">{t("Все статусы")}</option>{definition.statuses.map((option) => <option key={option} value={option}>{t(option)}</option>)}</select></div></div><div className="flex items-center gap-2"><Button variant="ghost" size="icon" aria-label={t("Обновить данные")} onClick={function handleRefresh() { router.refresh(); setMessage(t("Данные обновляются")); }}><RefreshCw /></Button>{definition.board && <div className="flex rounded-lg border bg-[hsl(var(--color-surface))] p-1"><Button size="sm" variant={view === "table" ? "outline" : "ghost"} aria-label={t("Список")} aria-pressed={view === "table"} onClick={() => setView("table")} className="!h-7 !px-2"><List className="!size-3.5" /></Button><Button size="sm" variant={view === "board" ? "outline" : "ghost"} aria-label={t("Канбан")} aria-pressed={view === "board"} onClick={() => setView("board")} className="!h-7 !px-2"><Columns3 className="!size-3.5" /></Button></div>}</div></div>
    {view === "board" && definition.board ? <KanbanBoard rows={filtered} domain={domain} disabled={!canWrite || busy} onEdit={handleRowEdit} onMove={handleStageMove} /> : <DataTable rows={filtered} domain={domain} session={session} selection={selection} onSelectionChange={setSelection} onEdit={handleRowEdit} onDelete={handleRowDelete} onPayment={setPaying} />}
    {domain === "finance" && <div className="panel flex items-start gap-3 p-4"><span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-[hsl(var(--color-primary))]" /><p className="text-[10px] leading-relaxed muted">{t("Путь счёта: черновик → отправлен → частично оплачен → оплачен. Для поступления используйте значок карты в строке счёта. Оплаченные счета защищены от удаления.")}</p></div>}
    {formOpen && <RecordForm key={editing?.id ?? "new"} domain={domain} record={editing} onSave={handleSave} onClose={() => setFormOpen(false)} />}
    {deleting && <ConfirmDialog title={t("Удалить запись?")} description={t`«${deleting.data.title}» будет удалена из рабочего пространства. В журнале действий сохранится событие удаления.`} busy={busy} error={deleteError} onConfirm={handleDeleteConfirm} onClose={() => setDeleting(null)} />}
    {paying && <PaymentForm invoice={paying} payments={state.payments} onClose={() => setPaying(null)} onSaved={handleRecordSaved} />}
  </div>;
}
