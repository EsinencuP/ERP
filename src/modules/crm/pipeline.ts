import type { DealStage } from "@prisma/client";
import type { DealFilters, DealPipelineByStage, PipelineDeal } from "./types";

export const PIPELINE_STAGES = {
  NEW: { label: "Новая", probability: 10, tone: "info" },
  QUALIFIED: { label: "Квалификация", probability: 25, tone: "primary" },
  PROPOSAL: { label: "Предложение", probability: 50, tone: "warning" },
  NEGOTIATION: { label: "Переговоры", probability: 75, tone: "primary" },
  WON: { label: "Выиграна", probability: 100, tone: "success" },
  LOST: { label: "Проиграна", probability: 0, tone: "danger" },
} as const satisfies Record<DealStage, { label: string; probability: number; tone: string }>;
export const PIPELINE_QUERY = { page: 1, pageSize: 20, sort: { field: "updatedAt", direction: "desc" } } as const satisfies DealFilters;

/** Recognize only explicit stages from an untrusted DnD identifier or event payload. */
export function getPipelineStage(value: unknown): DealStage | null {
  return typeof value === "string" && Object.hasOwn(PIPELINE_STAGES, value) ? value as DealStage : null;
}

/** Keep droppable container IDs distinct from database-generated deal IDs. */
export function getPipelineColumnId(stage: DealStage): string { return `pipeline-column:${stage}`; }

/** Decode a column ID without accepting arbitrary strings as stages. */
export function getPipelineColumnStage(value: unknown): DealStage | null {
  return typeof value === "string" && value.startsWith("pipeline-column:") ? getPipelineStage(value.slice("pipeline-column:".length)) : null;
}

/** Move a loaded card immutably while retaining exact total counts for its two columns. */
export function movePipelineDeal(board: DealPipelineByStage, deal: PipelineDeal, stage: DealStage): DealPipelineByStage {
  if (deal.stage === stage) return board;
  const source = board[deal.stage];
  const target = board[stage];
  const sourceTotal = Math.max(0, source.total - 1);
  const targetTotal = target.total + 1;
  return {
    ...board,
    [deal.stage]: { ...source, data: source.data.filter((item) => item.id !== deal.id), total: sourceTotal, totalPages: Math.ceil(sourceTotal / source.pageSize) },
    [stage]: { ...target, data: [{ ...deal, stage }, ...target.data.filter((item) => item.id !== deal.id)], total: targetTotal, totalPages: Math.ceil(targetTotal / target.pageSize) },
  };
}
