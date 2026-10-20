"use client";
import { useI18n } from "@/i18n/use-i18n";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, LayoutGrid, List, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecordPicker } from "@/components/ui/record-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorPanel } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePermissions } from "@/hooks/usePermissions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { canWrite, canDeleteDocument } from "@/lib/permissions";
import { ok } from "@/lib/errors";
import type { Result } from "@/types/shared";
import { deleteTask, getTaskWorkspace, getTaskProjects, getTaskAssignees, updateTaskStatus } from "../actions";
import { taskFiltersSchema, TASK_STATUSES, TASK_PRIORITIES } from "../task-schema";
import { moveBoardTask, updateBoardTask } from "../task-board";
import type { Task, TaskAssignee, TaskProject, TaskStatus, TaskWorkspaceData } from "../task-types";
import { TaskKanban } from "./task-kanban";
import { TaskList } from "./task-list";
import { TaskFormSheet } from "./task-form-sheet";
import { ProjectQuickForm } from "./project-quick-form";
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "./task-presentation";

const defaultFilters = taskFiltersSchema.parse({});
type Filters = typeof defaultFilters;

/** Coordinate one filtered task dataset, guarded optimistic moves and the Kanban/List toggle. */
export function TaskWorkspace({ initialData, initialNow, initialProject = null }: { initialData: Result<TaskWorkspaceData>; initialNow: string; initialProject?: TaskProject | null }) {
  const { t } = useI18n();

  const router = useRouter(), { role } = usePermissions(), [data, setData] = useState(initialData), [filters, setFilters] = useState(() => ({ ...defaultFilters, ...(initialProject ? { projectId: initialProject.id } : {}) })), [view, setView] = useState<"board" | "list">("board");
  const [search, setSearch] = useState(""), query = useDebouncedValue(search), [project, setProject] = useState<TaskProject | null>(initialProject), [assignee, setAssignee] = useState<TaskAssignee | null>(null), [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [dragging, setDragging] = useState(false), [blocked, setBlocked] = useState(false), [error, setError] = useState(""), [now, setNow] = useState(initialNow), [announcement, setAnnouncement] = useState("");
  const [form, setForm] = useState<Task | "create" | "project" | null>(null), [deleting, setDeleting] = useState<Task | null>(null), [deleteError, setDeleteError] = useState(""), [deleteBlocked, setDeleteBlocked] = useState(false);
  const first = useRef(true), saving = useRef(false), reading = useRef(false), focus = useRef<HTMLElement | null>(null), pendingFocus = useRef(false), refreshButton = useRef<HTMLButtonElement | null>(null), alive = useRef(true);
  const pendingSearch = search !== filters.search, locked = busy || loading || blocked || pendingSearch || form !== null || deleting !== null, occupied = locked || dragging, mayWrite = canWrite(role), mayDelete = canDeleteDocument(role, "projects");
  useEffect(() => { alive.current = true; const timer = window.setInterval(() => setNow(new Date().toISOString()), 60000); return () => { alive.current = false; window.clearInterval(timer); }; }, []);
  useEffect(() => { setFilters((current) => query === current.search ? current : { ...current, search: query, page: 1, columnPages: defaultFilters.columnPages }); }, [query]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    let current = true; reading.current = true; setLoading(true);
    getTaskWorkspace(filters).then((result) => { if (current) { setData(result); if (result.ok) { setBlocked(false); setError(""); setNow(new Date().toISOString()); } } }).catch(() => { if (current) setData({ ok: false, error: { code: "STORAGE", message: t("Не удалось загрузить задачи. Проверьте соединение") } }); }).finally(() => { if (current) { reading.current = false; setLoading(false); } });
    return () => { current = false; };
  }, [filters, revision]);
  useEffect(() => { if (!loading && pendingFocus.current) { pendingFocus.current = false; refreshButton.current?.focus({ preventScroll: true }); } }, [loading]);
  function handleReload() { reading.current = true; setLoading(true); setRevision((value) => value + 1); router.refresh(); }
  function handleRefresh() { if (!saving.current && !dragging) handleReload(); }
  function handleCapture() { focus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }
  function handleReturn() { if (reading.current) { pendingFocus.current = true; return; } const previous = focus.current; if (previous?.isConnected && !previous.matches(":disabled")) previous.focus({ preventScroll: true }); else refreshButton.current?.focus({ preventScroll: true }); }
  function handleFilter(patch: Partial<Filters>) { setFilters((current) => ({ ...current, ...patch, page: 1, columnPages: defaultFilters.columnPages })); }
  function handleEdit(task: Task) { if (occupied || !mayWrite) return; handleCapture(); setForm(task); }
  function handleAskDelete(task: Task) { if (occupied || !mayDelete) return; setDeleting(task); setDeleteError(""); setDeleteBlocked(false); }
  function handleClose(reload = false) { setForm(null); if (reload) handleReload(); }
  function handleSaved() { setForm(null); handleReload(); }
  async function handleMove(task: Task, status: TaskStatus) {
    if (saving.current || locked || !mayWrite || !data.ok || task.status === status || task.status === "CANCELLED") return;
    const before = data.data; saving.current = true; setBusy(true); setError(""); setAnnouncement(t`Сохраняется статус ${status}`);
    setData(ok({ ...before, board: moveBoardTask(before.board, task, status), list: { ...before.list, data: before.list.data.map((row) => row.id === task.id ? { ...row, status } : row) } }));
    let committed = false;
    try {
      const result = await updateTaskStatus(task.id, task.version, status); if (!alive.current) return;
      if (!result.ok) { setData(ok(before)); setBlocked(true); setError(t`${result.error.message}. Показано прежнее состояние. Обновите задачи перед повтором`); return; }
      committed = true;
      setData((current) => current.ok ? ok({ board: updateBoardTask(current.data.board, result.data), list: { ...current.data.list, data: current.data.list.data.map((row) => row.id === task.id ? result.data : row) } }) : current);
      const fresh = await getTaskWorkspace(filters); if (!alive.current) return;
      if (fresh.ok) { setData(fresh); setNow(new Date().toISOString()); setAnnouncement(t`Сохранено: ${task.title}, ${status}`); }
      else { setData(fresh); setBlocked(true); setError(t("Статус сохранён, но перечитать задачи не удалось. Обновите данные")); }
    } catch { if (alive.current) { if (!committed) setData(ok(before)); setBlocked(true); setError(committed ? t("Статус сохранён. Обновите задачи для сверки") : t("Результат переноса неизвестен. Показано прежнее состояние; обновите задачи перед повтором")); } }
    finally { saving.current = false; if (alive.current) setBusy(false); }
  }
  async function handleDelete() {
    if (!deleting || saving.current || deleteBlocked) return; saving.current = true; setBusy(true);
    try { const result = await deleteTask(deleting.id, deleting.version); if (!result.ok) { setDeleteError(result.error.message); setDeleteBlocked(result.error.code !== "VALIDATION"); return; } toast.success(t("Задача удалена")); setDeleting(null); handleReload(); }
    catch { setDeleteError(t("Результат удаления неизвестен. Закройте окно и обновите задачи")); setDeleteBlocked(true); }
    finally { saving.current = false; setBusy(false); }
  }
  const total = data.ok ? view === "board" ? TASK_STATUSES.reduce((sum, status) => sum + data.data.board[status].total, 0) : data.data.list.total : null;
  return <section className="motion-fade min-w-0 space-y-5" aria-labelledby="tasks-title"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-3">{t("Projects / Tasks")}</p><h1 id="tasks-title" className="text-2xl font-semibold sm:text-3xl">{t("Задачи команды")}</h1><p className="mt-3 text-sm text-muted-foreground">{t("От первого шага до результата — по проектам, исполнителям и срокам.")}</p></div>{mayWrite && data.ok && <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={occupied} onClick={function handleProject() { handleCapture(); setForm("project"); }}><FolderPlus />{t("Новый проект")}</Button><Button disabled={occupied} onClick={function handleCreate() { handleCapture(); setForm("create"); }}><Plus />{t("Новая задача")}</Button></div>}</header>
    <div className="flex flex-wrap items-end gap-3"><div className="w-full sm:w-56"><label htmlFor="task-search" className="mb-2 block text-xs font-medium">{t("Поиск задач")}</label><Input id="task-search" type="search" maxLength={200} disabled={busy || dragging || form !== null || deleting !== null} value={search} placeholder={t("Название, проект, исполнитель")} onChange={function handleSearch(event) { setSearch(event.target.value); }} /></div><div className="w-full sm:w-48"><RecordPicker label={t("Проект")} selected={project} disabled={occupied} load={getTaskProjects} emptyLabel={t("Все проекты")} onSelect={function handleProject(value) { setProject(value); handleFilter({ projectId: value?.id }); }} /></div><div className="w-full sm:w-48"><RecordPicker label={t("Исполнитель")} selected={assignee} disabled={occupied} load={getTaskAssignees} emptyLabel={t("Все исполнители")} onSelect={function handleAssignee(value) { setAssignee(value); handleFilter({ assignedToId: value?.id }); }} /></div><div><label htmlFor="task-priority" className="mb-2 block text-xs font-medium">{t("Приоритет")}</label><select id="task-priority" className="input" disabled={occupied} value={filters.priority ?? ""} onChange={function handlePriority(event) { const parsed = taskFiltersSchema.safeParse({ priority: event.target.value || undefined }); if (parsed.success) handleFilter({ priority: parsed.data.priority }); }}><option value="">{t("Все приоритеты")}</option>{TASK_PRIORITIES.map((value) => <option key={value} value={value}>{t(TASK_PRIORITY_LABELS[value])}</option>)}</select></div>{view === "list" && <div><label htmlFor="task-filter-status" className="mb-2 block text-xs font-medium">{t("Статус в списке")}</label><select id="task-filter-status" className="input" disabled={occupied} value={filters.status ?? ""} onChange={function handleStatus(event) { const parsed = taskFiltersSchema.safeParse({ status: event.target.value || undefined }); if (parsed.success) handleFilter({ status: parsed.data.status }); }}><option value="">{t("Все статусы")}</option>{[...TASK_STATUSES, "CANCELLED" as const].map((value) => <option key={value} value={value}>{t(TASK_STATUS_LABELS[value])}</option>)}</select></div>}<div className="flex gap-1 rounded-lg border p-1" role="group" aria-label={t("Вид задач")}><Button size="icon" variant={view === "board" ? "secondary" : "ghost"} aria-label={t("Kanban")} aria-pressed={view === "board"} disabled={occupied} onClick={function handleBoard() { setView("board"); }}><LayoutGrid /></Button><Button size="icon" variant={view === "list" ? "secondary" : "ghost"} aria-label={t("List")} aria-pressed={view === "list"} disabled={occupied} onClick={function handleList() { setView("list"); }}><List /></Button></div><Button ref={refreshButton} size="icon" variant="outline" aria-label={t("Обновить задачи")} disabled={busy || loading || dragging || form !== null || deleting !== null} onClick={handleRefresh}><RefreshCw /></Button></div>
    <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>{error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{t(error)}</p>}{busy && <p role="status" className="text-xs text-muted-foreground">{t("Сохраняем задачу…")}</p>}
    {loading || pendingSearch ? <div role="status" aria-label={t("Загрузка задач")} className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[1, 2, 3, 4].map((key) => <Skeleton key={key} className="h-96" />)}</div> : !data.ok ? <ErrorPanel error={data.error} /> : <><p className="text-xs text-muted-foreground">{t("Найдено задач: ")}{total}{view === "board" ? t(" · Четыре рабочих статуса") : ""}</p>{total === 0 && <div className="panel"><EmptyState title={t("Задач пока нет")} description={filters.search || filters.projectId || filters.priority || filters.assignedToId || filters.status ? t("Измените поиск или фильтры.") : t("Создайте проект и добавьте первую задачу команды.")} /></div>}{view === "board" ? <><TaskKanban board={data.data.board} disabled={locked} mayWrite={mayWrite} mayDelete={mayDelete} now={now} onMove={handleMove} onEdit={handleEdit} onDelete={handleAskDelete} onPage={function handleColumnPage(status, page) { if (!occupied) setFilters((current) => ({ ...current, columnPages: { ...current.columnPages, [status]: page } })); }} onDraggingChange={setDragging} /><p className="text-[11px] text-muted-foreground">{t("До 20 задач на странице колонки. Перенос меняет статус; порядок — по дате изменения. Отменённые задачи доступны в List как история.")}</p></> : <TaskList data={data.data.list} sort={filters.sort} disabled={locked} mayWrite={mayWrite} mayDelete={mayDelete} now={now} onSort={function handleSort(sort) { setFilters((current) => ({ ...current, sort, page: 1 })); }} onPage={function handlePage(page) { setFilters((current) => ({ ...current, page })); }} onMove={handleMove} onEdit={handleEdit} onDelete={handleAskDelete} />}</>}
    {form && form !== "project" && <TaskFormSheet {...(form === "create" ? {} : { task: form })} project={project} onSaved={handleSaved} onClose={handleClose} onReturnFocus={handleReturn} />}
    {form === "project" && <ProjectQuickForm onSaved={function handleProjectSaved(value) { setForm(null); setProject(value); handleFilter({ projectId: value.id }); handleReload(); toast.success(t("Проект создан")); }} onClose={handleClose} onReturnFocus={handleReturn} />}
    {deleting && <ConfirmDialog title={t`Удалить задачу «${deleting.title}»?`} description={t("Удаление доступно только для задач без подзадач.")} busy={busy} error={deleteError} disabled={deleteBlocked} onConfirm={handleDelete} onClose={function handleCloseDelete() { if (saving.current) return; setDeleting(null); if (deleteBlocked) handleReload(); }} />}
  </section>;
}
