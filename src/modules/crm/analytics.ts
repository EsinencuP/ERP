import "server-only";
import { db } from "@/lib/db";
import { ok } from "@/lib/errors";
import { getCrmContext } from "./access";
import { getCrmStorageError } from "./errors";
import { DEAL_STAGES } from "./schema";
import type { DealStage } from "@prisma/client";
import type { Result } from "@/types/shared";

export type DealDashboardData = { open: number; total: number; stages: { stage: DealStage; count: number }[] };

/** Aggregate every normalized tenant deal by stage without loading individual records or mixing currencies. */
export async function getDealDashboard(): Promise<Result<DealDashboardData>> {
  const context = await getCrmContext(); if (!context.ok) return context;
  try {
    const rows = await db.deal.groupBy({ by: ["stage"], where: { workspaceId: context.data.workspaceId }, _count: { _all: true } });
    const stages = DEAL_STAGES.map((stage) => ({ stage, count: rows.find((row) => row.stage === stage)?._count._all ?? 0 }));
    return ok({ stages, total: stages.reduce((sum, row) => sum + row.count, 0), open: stages.filter((row) => row.stage !== "WON" && row.stage !== "LOST").reduce((sum, row) => sum + row.count, 0) });
  } catch (error: unknown) { return getCrmStorageError(error); }
}
