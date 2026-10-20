"use client";
import { useI18n } from "@/i18n/use-i18n";


import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DealStage } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PaginatedResponse } from "@/types/shared";
import { getPipelineColumnId, PIPELINE_STAGES } from "../pipeline";
import type { PipelineDeal } from "../types";
import { DealCard } from "./deal-card";

/** Keep a full-size empty drop zone around a bounded, vertically scrollable sortable column. */
export function KanbanColumn({ stage, column, now, disabled, mayWrite, pendingId, onMove, onPage }: { stage: DealStage; column: PaginatedResponse<PipelineDeal>; now: string; disabled: boolean; mayWrite: boolean; pendingId: string | null; onMove: (id: string, stage: DealStage) => void; onPage: (stage: DealStage, page: number) => void }) {
  const { t } = useI18n();

  const { setNodeRef, isOver } = useDroppable({ id: getPipelineColumnId(stage), disabled: disabled || !mayWrite, data: { stage, type: "column" } });
  const definition = PIPELINE_STAGES[stage];
  return <section ref={setNodeRef} aria-label={t`Этап: ${definition.label}`} data-pipeline-column={stage} className={cn("motion-fade flex h-[min(44rem,calc(100dvh-15rem))] min-h-96 w-72 shrink-0 flex-col rounded-xl border bg-muted/20 transition-colors", isOver && "border-primary bg-primary/5")}>
    <header className="flex items-center gap-2.5 border-b px-4 py-4"><span className="size-2 shrink-0 rounded-full" aria-hidden="true" style={{ backgroundColor: `hsl(var(--color-${definition.tone}))` }} /><h2 className="flex-1 text-xs font-semibold">{t(definition.label)}</h2><span className="rounded-md border bg-surface px-2 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground" aria-label={t`Сделок: ${column.total}`}>{column.total}</span></header>
    <SortableContext id={getPipelineColumnId(stage)} items={column.data.map((deal) => deal.id)} strategy={verticalListSortingStrategy}>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3" role="list" aria-label={t`Сделки: ${definition.label}`}>
        {column.data.map((deal) => <div key={deal.id} role="listitem"><DealCard deal={deal} now={now} pending={pendingId === deal.id} disabled={disabled || !mayWrite} onMove={onMove} /></div>)}
        {!column.data.length && <p className="rounded-lg border border-dashed px-4 py-10 text-center text-xs leading-relaxed text-muted-foreground">{column.total > 0 ? t("На этой странице сделок нет") : mayWrite ? t("Перетащите сюда сделку") : t("Сделок пока нет")}</p>}
      </div>
    </SortableContext>
    <footer className="flex min-h-14 items-center justify-between gap-2 border-t px-3 py-2"><span className="text-[10px] text-muted-foreground">{column.data.length} {t(" из ")}{column.total}</span><div className="flex items-center gap-1"><Button size="icon" variant="ghost" className="size-7" aria-label={t`Предыдущая страница: ${definition.label}`} disabled={disabled || column.page <= 1} onClick={function handlePreviousPage() { onPage(stage, column.page - 1); }}><ChevronLeft /></Button><span className="font-mono text-[10px] tabular-nums text-muted-foreground">{column.page} / {Math.max(1, column.totalPages)}</span><Button size="icon" variant="ghost" className="size-7" aria-label={t`Следующая страница: ${definition.label}`} disabled={disabled || column.page >= column.totalPages} onClick={function handleNextPage() { onPage(stage, column.page + 1); }}><ChevronRight /></Button></div></footer>
  </section>;
}
