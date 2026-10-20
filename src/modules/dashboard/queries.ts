import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok } from "@/lib/errors";
import type { Result } from "@/types/shared";
import type { DashboardActivity } from "./types";

/** Read only the latest eight tenant audit summaries, excluding before/after payloads and foreign workspaces. */
export async function getDashboardActivity(): Promise<Result<DashboardActivity[]>> {
  noStore();
  const context = await getSession(); if (!context.ok) return context;
  if (context.data.demo) return err("CONFIGURATION", "Лента действий требует PostgreSQL и реального входа");
  try {
    const rows = await db.auditLog.findMany({ where: { workspaceId: context.data.workspaceId }, select: { id: true, actor: true, domain: true, action: true, title: true, entityType: true, entityId: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 8 });
    return ok(rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })));
  } catch { return err("STORAGE", "Не удалось загрузить ленту действий. Проверьте PostgreSQL"); }
}
