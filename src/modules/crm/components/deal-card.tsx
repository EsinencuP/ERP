"use client";
import { useI18n } from "@/i18n/use-i18n";


import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceStrict } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import { Building2, CalendarDays, GripVertical, History, Loader2 } from "lucide-react";
import type { DealStage } from "@prisma/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, dateLabel, formatCurrency, initials } from "@/lib/utils";
import { DEAL_STAGES } from "../schema";
import { getPipelineStage, PIPELINE_STAGES } from "../pipeline";
import type { PipelineDeal } from "../types";

type CardProps = { deal: PipelineDeal; now: string; disabled: boolean; pending: boolean; onMove: (id: string, stage: DealStage) => void };

/** Plain card content shared with DragOverlay; never registers a second draggable. */
export function DealCardContent({ deal, now, pending, controls }: { deal: PipelineDeal; now: string; pending: boolean; controls?: React.ReactNode }) {
  const { t , locale: uiLocale } = useI18n();

  const stage = PIPELINE_STAGES[deal.stage];
  const amount = formatCurrency(deal.value, deal.currency, uiLocale);
  return <>
    <div className="flex min-w-0 items-center gap-2"><Building2 className="size-3.5 shrink-0 text-muted-foreground" /><p className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground" title={deal.contact.company ?? deal.contact.name}>{deal.contact.company || deal.contact.name}</p>{controls}</div>
    <h3 className="mt-3 break-words text-sm font-medium leading-relaxed">{deal.title}</h3>
    <p className={cn("mt-4 whitespace-nowrap font-mono font-medium tabular-nums tracking-tight", amount.length > 23 ? "text-xs" : "text-lg")} title={amount}>{amount}</p>
    <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" />{deal.expectedCloseDate ? <time dateTime={deal.expectedCloseDate} title={t`План закрытия: ${deal.expectedCloseDate}`}>{dateLabel(deal.expectedCloseDate, uiLocale)}</time> : t("Дата не задана")}</span>{deal.owner ? <Avatar className="size-7 border" title={t`Ответственный: ${deal.owner.name}`} aria-label={t`Ответственный: ${deal.owner.name}`}><AvatarImage src={deal.owner.avatar ?? undefined} alt="" /><AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">{initials(deal.owner.name)}</AvatarFallback></Avatar> : <span className="text-[10px]">{t("Не назначен")}</span>}</div>
    <div className="mt-4 border-t pt-3"><div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><History className="size-3" /><span>{t("Последняя активность")}</span></div>{deal.lastActivity ? <><p className="mt-1 truncate text-xs" title={deal.lastActivity.subject}>{deal.lastActivity.subject}</p><time className="mt-1 block text-[10px] text-muted-foreground" dateTime={deal.lastActivity.createdAt} title={deal.lastActivity.createdAt}>{formatDistanceStrict(new Date(deal.lastActivity.createdAt), new Date(now), { locale: uiLocale === "ru" ? ru : enUS, addSuffix: true })}</time></> : <p className="mt-1 text-xs text-muted-foreground">{t("Активностей пока нет")}</p>}</div>
    <div className="mt-4"><div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground"><span>{t("Вероятность по этапу")}</span><span className="font-mono tabular-nums" style={{ color: `hsl(var(--color-${stage.tone}))` }}>{stage.probability}%</span></div><div role="progressbar" aria-label={t`Вероятность по этапу: ${deal.title}`} aria-valuenow={stage.probability} aria-valuemin={0} aria-valuemax={100} className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-[width] duration-150" style={{ width: `${stage.probability}%`, backgroundColor: `hsl(var(--color-${stage.tone}))` }} /></div></div>
    {pending && <p className="mt-3 flex items-center gap-1.5 text-[10px] text-primary" role="status"><Loader2 className="size-3 animate-spin" />{t("Сохраняется…")}</p>}
  </>;
}

/** Register one sortable deal, with a dedicated drag handle and an accessible stage alternative. */
export function DealCard({ deal, now, disabled, pending, onMove }: CardProps) {
  const { t } = useI18n();

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id, disabled, data: { stage: deal.stage, type: "deal" } });
  return <article ref={setNodeRef} aria-label={t`Сделка: ${deal.title}`} aria-busy={pending} data-deal-id={deal.id} data-stage={deal.stage} className={cn("motion-fade relative rounded-xl border bg-surface p-4 shadow-sm", isDragging && "opacity-25", pending && "border-primary/50")} style={{ transform: CSS.Transform.toString(transform), transition }}>
    <DealCardContent deal={deal} now={now} pending={pending} controls={<button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={t`Переместить сделку: ${deal.title}`} disabled={disabled} className="touch-none rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"><GripVertical className="size-4" /></button>} />
    <label className="sr-only" htmlFor={`deal-stage-${deal.id}`}>{t("Этап: ")}{deal.title}</label><select id={`deal-stage-${deal.id}`} className="input mt-4 h-8 px-2 text-[11px]" value={deal.stage} disabled={disabled} onChange={function handleStageChange(event) { const stage = getPipelineStage(event.target.value); if (stage) onMove(deal.id, stage); }}>{DEAL_STAGES.map((stage) => <option key={stage} value={stage}>{t(PIPELINE_STAGES[stage].label)}</option>)}</select>
  </article>;
}
