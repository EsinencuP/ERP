"use client";
import { useI18n } from "@/i18n/use-i18n";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorPanel } from "@/components/ui/feedback";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePermissions } from "@/hooks/usePermissions";
import { canWrite } from "@/lib/permissions";
import type { Result } from "@/types/shared";
import { getProjectOverview } from "../actions";
import { overviewFiltersSchema, PROJECT_STATUSES } from "../overview-schema";
import type { OverviewFilters, OverviewProject, ProjectOverviewData } from "../overview-types";
import { PROJECT_STATUS_LABELS } from "./project-status";
import { ProjectOverviewCard } from "./project-overview-card";
import { OverviewProjectForm } from "./overview-project-form";
import { ProjectTeamDialog } from "./project-team-dialog";
import { getDefaultProjectTimeline } from "../overview-calculations";
import { ProjectTimeline } from "./project-timeline";

/** Coordinate server-paginated overview cards and the matching project timeline, with explicit error/empty states. */
export function ProjectOverview({ initialData, initialFilters = {} }: { initialData: Result<ProjectOverviewData>; initialFilters?: OverviewFilters }) {
  const { t } = useI18n();

  const router = useRouter(), { role } = usePermissions(), [data, setData] = useState(initialData), [filters, setFilters] = useState(() => { const result = overviewFiltersSchema.safeParse(initialFilters); return result.success ? result.data : overviewFiltersSchema.parse({}); });
  const [timelinePeriod, setTimelinePeriod] = useState(() => getDefaultProjectTimeline(initialData.ok ? initialData.data.asOf : new Date().toISOString()));
  const [search, setSearch] = useState(""), query = useDebouncedValue(search), [revision, setRevision] = useState(0), [loading, setLoading] = useState(false), [form, setForm] = useState<OverviewProject | "create" | null>(null), [team, setTeam] = useState<OverviewProject | null>(null);
  const first = useRef(true), reading = useRef(false), focus = useRef<HTMLElement | null>(null), pendingFocus = useRef(false), refreshButton = useRef<HTMLButtonElement | null>(null), occupied = loading || form !== null || team !== null;
  useEffect(() => { setFilters((current) => current.search === query ? current : { ...current, search: query, page: 1 }); }, [query]);
  useEffect(() => { if (first.current) { first.current = false; return; } let alive = true; reading.current = true; setLoading(true); getProjectOverview(filters).then((value) => { if (alive) setData(value); }).catch(() => { if (alive) setData({ ok: false, error: { code: "STORAGE", message: t("Не удалось загрузить обзор проектов") } }); }).finally(() => { if (alive) { reading.current = false; setLoading(false); } }); return () => { alive = false; }; }, [filters, revision]);
  useEffect(() => { if (!loading && pendingFocus.current) { pendingFocus.current = false; refreshButton.current?.focus({ preventScroll: true }); } }, [loading]);
  function handleCapture() { focus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }
  function handleReturn() { if (reading.current) { pendingFocus.current = true; return; } const previous = focus.current; if (previous?.isConnected && !previous.matches(":disabled")) previous.focus({ preventScroll: true }); else refreshButton.current?.focus({ preventScroll: true }); }
  function handleRefresh() { reading.current = true; setLoading(true); setRevision((value) => value + 1); router.refresh(); }
  function handleClose(reload = false) { setForm(null); if (reload) handleRefresh(); }
  return <section aria-labelledby="projects-overview-title" className="motion-fade min-w-0 space-y-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-3">{t("Projects / Overview")}</p><h1 id="projects-overview-title" className="text-2xl font-semibold sm:text-3xl">{t("Обзор проектов")}</h1><p className="mt-3 text-sm text-muted-foreground">{t("Выполнение, затраты и люди — в одном плане.")}</p></div>{canWrite(role) && data.ok && <Button disabled={occupied || search !== filters.search} onClick={function handleCreate() { handleCapture(); setForm("create"); }}><Plus />{t("Новый проект")}</Button>}</header><div className="flex flex-wrap items-end gap-3"><div className="w-full sm:w-72"><label htmlFor="project-overview-search" className="mb-2 block text-xs font-medium">{t("Поиск проектов")}</label><Input id="project-overview-search" type="search" maxLength={200} value={search} disabled={form !== null || team !== null} onChange={function handleSearch(event) { setSearch(event.target.value); }} placeholder={t("Название, код или описание")} /></div><div><label htmlFor="project-overview-status" className="mb-2 block text-xs font-medium">{t("Статус проекта")}</label><select id="project-overview-status" className="input" value={filters.status ?? ""} disabled={occupied} onChange={function handleStatus(event) { const result = overviewFiltersSchema.safeParse({ ...filters, status: event.target.value || undefined, page: 1 }); if (result.success) setFilters(result.data); }}><option value="">{t("Все статусы")}</option>{PROJECT_STATUSES.map((value) => <option key={value} value={value}>{t(PROJECT_STATUS_LABELS[value])}</option>)}</select></div><Button ref={refreshButton} variant="outline" size="icon" aria-label={t("Обновить обзор проектов")} disabled={occupied} onClick={handleRefresh}><RefreshCw /></Button>{filters.projectId && <Button variant="ghost" disabled={occupied} onClick={function handleAllProjects() { setFilters((current) => ({ ...current, projectId: undefined, page: 1 })); router.replace("/projects/overview"); }}>{t("Все проекты")}</Button>}</div>
    {loading || search !== filters.search ? <div role="status" aria-label={t("Загрузка обзора проектов")} className="grid gap-6 xl:grid-cols-2">{[1, 2].map((key) => <Skeleton key={key} className="h-96" />)}</div> : !data.ok ? <ErrorPanel error={data.error} /> : <><p className="text-xs text-muted-foreground">{t("Найдено проектов: ")}{data.data.total} {t(" · На странице: ")}{data.data.data.length}</p>{!data.data.total ? <div className="panel"><EmptyState title={t("Проекты не найдены")} description={filters.search || filters.status || filters.projectId ? t("Измените поиск или фильтры.") : t("Создайте проект и задайте его бюджет, сроки и руководителя.")} /></div> : <><div className="grid min-w-0 gap-6 xl:grid-cols-2">{data.data.data.map((project) => <ProjectOverviewCard key={project.id} project={project} mayWrite={canWrite(role)} disabled={occupied} onEdit={function handleEdit(value) { handleCapture(); setForm(value); }} onTeam={function handleTeam(value) { handleCapture(); setTeam(value); }} />)}</div><footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{t("До 12 проектов на странице")}</span><div className="flex items-center gap-3"><Button variant="outline" disabled={occupied || data.data.page <= 1} onClick={function handlePrevious() { setFilters((current) => ({ ...current, page: data.data.page - 1 })); }}>{t("Назад")}</Button><span>{data.data.page} / {Math.max(1, data.data.totalPages)}</span><Button variant="outline" disabled={occupied || data.data.page >= data.data.totalPages} onClick={function handleNext() { setFilters((current) => ({ ...current, page: data.data.page + 1 })); }}>{t("Далее")}</Button></div></footer><ProjectTimeline projects={data.data.data} now={data.data.asOf} period={timelinePeriod} onPeriod={setTimelinePeriod} /></>}</>}
    {form && <OverviewProjectForm {...(form === "create" ? {} : { project: form })} onSaved={function handleSaved() { setForm(null); handleRefresh(); toast.success(t("Проект сохранён")); }} onClose={handleClose} onReturnFocus={handleReturn} />}
    {team && <ProjectTeamDialog project={team} onClose={function handleCloseTeam() { setTeam(null); }} onReturnFocus={handleReturn} />}
  </section>;
}
