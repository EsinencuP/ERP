"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import type { DealStage } from "@prisma/client";
import { AlertCircle, LayoutGrid, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { canWrite } from "@/lib/permissions";
import { ok } from "@/lib/errors";
import type { Result } from "@/types/shared";
import { getDealsByStage, updateDealStage } from "../actions";
import { DEAL_STAGES } from "../schema";
import { getPipelineColumnStage, movePipelineDeal, PIPELINE_QUERY, PIPELINE_STAGES } from "../pipeline";
import type { DealPipelineByStage } from "../types";
import { DealCardContent } from "./deal-card";
import { KanbanColumn } from "./kanban-column";
import { pipelineCollisionDetection, pipelineKeyboardCoordinates } from "./pipeline-dnd";

/** Manage optimistic stage changes with one in-flight mutation, rollback and commit-aware reconciliation. */
export function DealKanban({ initialData, initialNow }: { initialData: Result<DealPipelineByStage>; initialNow: string }) {
  const [result, setResult] = useState(initialData);
  const [now, setNow] = useState(initialNow);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [mounted, setMounted] = useState(false);
  const alive = useRef(true);
  const busy = useRef(false);
  const { role } = usePermissions();
  const mayWrite = canWrite(role);
  const locked = pendingId !== null || loading || needsRefresh;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 7 } }), useSensor(KeyboardSensor, { coordinateGetter: pipelineKeyboardCoordinates }));
  const cards = result.ok ? DEAL_STAGES.flatMap((stage) => result.data[stage].data) : [];
  const activeDeal = cards.find((deal) => deal.id === activeId) ?? null;
  const total = result.ok ? DEAL_STAGES.reduce((sum, stage) => sum + result.data[stage].total, 0) : 0;

  useEffect(() => {
    alive.current = true; setMounted(true);
    const timer = window.setInterval(() => setNow(new Date().toISOString()), 60_000);
    return () => { alive.current = false; window.clearInterval(timer); };
  }, []);

  async function handleRefresh() {
    if (busy.current || activeId) return;
    busy.current = true; setLoading(true); setError("");
    try {
      const fresh = await getDealsByStage(PIPELINE_QUERY);
      if (!alive.current) return;
      if (fresh.ok) { setResult(fresh); setNeedsRefresh(false); setNow(new Date().toISOString()); setAnnouncement("Воронка обновлена"); }
      else { if (!result.ok) setResult(fresh); setError(fresh.error.message); setNeedsRefresh(true); }
    } catch { if (alive.current) { setError("Не удалось обновить воронку. Проверьте соединение и повторите запрос"); setNeedsRefresh(true); } }
    finally { busy.current = false; if (alive.current) setLoading(false); }
  }

  async function handlePage(stage: DealStage, page: number) {
    if (busy.current || locked || activeId || !result.ok) return;
    busy.current = true; setLoading(true); setError("");
    try {
      let response = await getDealsByStage({ ...PIPELINE_QUERY, stage, page });
      if (response.ok && page > Math.max(1, response.data[stage].totalPages)) response = await getDealsByStage({ ...PIPELINE_QUERY, stage, page: Math.max(1, response.data[stage].totalPages) });
      if (!alive.current) return;
      if (response.ok) { const column = response.data[stage]; setResult((current) => current.ok ? ok({ ...current.data, [stage]: column }) : current); }
      else { setError(response.error.message); setNeedsRefresh(true); }
    } catch { if (alive.current) { setError("Не удалось загрузить этап. Обновите воронку перед следующей операцией"); setNeedsRefresh(true); } }
    finally { busy.current = false; if (alive.current) setLoading(false); }
  }

  async function handleMove(id: string, stage: DealStage) {
    if (busy.current || locked || !mayWrite || !result.ok) return;
    const before = result.data;
    const deal = DEAL_STAGES.flatMap((key) => before[key].data).find((item) => item.id === id);
    if (!deal || deal.stage === stage) return;
    busy.current = true; setPendingId(id); setError("");
    setResult(ok(movePipelineDeal(before, deal, stage)));
    setAnnouncement(`Сделка «${deal.title}» перемещена в «${PIPELINE_STAGES[stage].label}». Сохранение…`);
    let committed = false;
    try {
      const response = await updateDealStage(id, deal.version, stage);
      if (!alive.current) return;
      if (!response.ok) {
        setResult(ok(before)); setNeedsRefresh(true);
        setError(`${response.error.message}. Карточка возвращена. Обновите воронку перед повтором`);
        setAnnouncement(`Перемещение сделки «${deal.title}» отменено`);
        return;
      }
      committed = true;
      const saved = response.data;
      setResult((current) => current.ok ? ok({ ...current.data, [stage]: { ...current.data[stage], data: current.data[stage].data.map((item) => item.id === id ? { ...item, ...saved } : item) } }) : current);
      setAnnouncement(`Сохранено: «${deal.title}», этап «${PIPELINE_STAGES[stage].label}»`);
      const fresh = await getDealsByStage(PIPELINE_QUERY);
      if (!alive.current) return;
      if (fresh.ok) { setResult(fresh); setNow(new Date().toISOString()); }
      else { setError("Этап сохранён, но обновить воронку не удалось. Нажмите «Обновить воронку»"); setNeedsRefresh(true); }
    } catch {
      if (alive.current) {
        if (!committed) setResult(ok(before));
        setNeedsRefresh(true);
        setError(committed ? "Этап сохранён. Не удалось перечитать данные; обновите воронку" : "Не удалось подтвердить сохранение. Показано предыдущее состояние; обновите воронку перед повтором");
        setAnnouncement(committed ? "Этап сохранён, требуется обновление воронки" : "Сохранение не подтверждено, требуется обновление воронки");
      }
    } finally { busy.current = false; if (alive.current) setPendingId(null); }
  }

  function handleDragStart(event: DragStartEvent) {
    if (busy.current || locked || !mayWrite) return;
    setActiveId(String(event.active.id)); setError("");
  }
  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const stage = getPipelineColumnStage(event.over?.id);
    if (stage) void handleMove(String(event.active.id), stage);
  }
  function handleDragCancel() { setActiveId(null); setAnnouncement("Перемещение отменено"); }
  function getDealTitle(id: string | number): string { return cards.find((deal) => deal.id === String(id))?.title ?? "Сделка"; }

  return <div className="motion-fade space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-3 text-muted-foreground">CRM / Сделки</p><h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight">Воронка сделок<span className="rounded-lg border px-2.5 py-1 font-mono text-sm tabular-nums text-muted-foreground" aria-label={`Всего сделок: ${total}`}>{result.ok ? total : "—"}</span></h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{mayWrite ? "Переносите сделки между этапами и держите следующий шаг в поле зрения." : "Сделки команды на каждом этапе — от первого контакта до результата."}</p></div><Button variant="outline" disabled={pendingId !== null || loading || activeId !== null} onClick={handleRefresh}><RefreshCw className={loading ? "animate-spin" : ""} />Обновить воронку</Button></header>
    <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
    {(pendingId || loading) && <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status"><Loader2 className="size-3.5 animate-spin" />{pendingId ? "Сохраняем этап сделки…" : "Обновляем воронку…"}</p>}
    {error && <div className="motion-fade flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0" /><p>{error}</p></div>}
    {!result.ok ? <div className="motion-fade panel p-8" role="alert"><LayoutGrid className="mb-4 size-6 text-muted-foreground" /><h2 className="text-lg font-medium">{result.error.code === "CONFIGURATION" ? "Воронка доступна в подключённом рабочем пространстве" : "Не удалось загрузить воронку"}</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{result.error.code === "CONFIGURATION" ? "Деморежим содержит учебные сделки на отдельной вкладке. Для новой воронки войдите в рабочее пространство с подключённой базой данных." : result.error.message}</p><Button className="mt-5" variant="outline" disabled={loading} onClick={handleRefresh}>Повторить загрузку</Button></div> : <>
      {!total && <p className="motion-fade rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">В воронке пока нет сделок. Все шесть этапов готовы к работе.</p>}
      <DndContext id="crm-deal-pipeline" sensors={sensors} collisionDetection={pipelineCollisionDetection} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel} accessibility={{ screenReaderInstructions: { draggable: "Нажмите пробел для переноса сделки. Стрелки влево и вправо выбирают этап, включая пустой. Пробел сохраняет, Escape отменяет. Этап также можно выбрать списком в карточке." }, announcements: {
        onDragStart: ({ active }) => `Выбрана сделка «${getDealTitle(active.id)}». Используйте стрелки влево и вправо для выбора этапа.`,
        onDragOver: ({ over }) => { const stage = getPipelineColumnStage(over?.id); return stage ? `Этап «${PIPELINE_STAGES[stage].label}»` : "Сделка вне этапов"; },
        onDragEnd: ({ over }) => { const stage = getPipelineColumnStage(over?.id); return stage ? `Сделка отпущена в этап «${PIPELINE_STAGES[stage].label}»` : "Перемещение отменено"; },
        onDragCancel: () => "Перемещение отменено",
      } }}>
        <div data-pipeline-board className="overflow-x-auto rounded-xl pb-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" role="region" aria-label="Воронка по этапам" tabIndex={0}><div className="flex w-max items-start gap-4">{DEAL_STAGES.map((stage) => <KanbanColumn key={stage} stage={stage} column={result.data[stage]} now={now} disabled={locked} mayWrite={mayWrite} pendingId={pendingId} onMove={handleMove} onPage={handlePage} />)}</div></div>
        {mounted && createPortal(<DragOverlay dropAnimation={null}>{activeDeal ? <div className="w-72 rounded-xl border border-primary bg-surface p-4 shadow-xl" aria-hidden="true"><DealCardContent deal={activeDeal} now={now} pending={false} /></div> : null}</DragOverlay>, document.body)}
      </DndContext>
      <p className="text-[11px] leading-relaxed text-muted-foreground">До 20 сделок на странице каждого этапа. Перенос меняет этап; карточки упорядочены по дате изменения. Вероятность — оценка по этапу.</p>
    </>}
  </div>;
}
