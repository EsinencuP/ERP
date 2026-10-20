"use server";
import { localizeResult } from "@/i18n/server";


import { z } from "zod";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getWorkspaceState } from "@/lib/repository";
import { domainSchema } from "@/lib/record-schema";
import { err, ok } from "@/lib/errors";
import type { DocumentRecord, Result } from "@/types/shared";

/** Export dashboard data from a freshly authorized tenant snapshot, never client-supplied totals. */
export async function getExportReport(period: unknown): Promise<Result<(string | number)[][]>> {
  const session = await getSession();
  if (!session.ok) return localizeResult(await session);
  if (!hasPermission(session.data.role, "canExport")) return localizeResult(await err("FORBIDDEN", "Нет права на экспорт данных"));
  const parsed = z.enum(["30", "90", "365"]).safeParse(period);
  if (!parsed.success) return localizeResult(await err("VALIDATION", "Неверный период отчёта"));
  const state = await getWorkspaceState(session.data);
  if (!state.ok) return localizeResult(await state);
  const days = Number(parsed.data);
  const end = Date.now();
  const start = end - days * 86400000;
  const receipts = state.data.payments.filter((row) => { const time = new Date(row.createdAt).getTime(); return time >= start && time <= end; });
  const invoices = state.data.documents.filter((row) => row.domain === "finance");
  const paid = new Map<string, number>();
  for (const payment of state.data.payments) paid.set(payment.documentId, (paid.get(payment.documentId) ?? 0) + payment.amount);
  const outstanding = invoices.filter((row) => row.data.status !== "Черновик").reduce((sum, row) => sum + Math.max(0, row.data.amount - (paid.get(row.id) ?? 0)), 0);
  return localizeResult(await ok([
    ["Показатель", "Значение"], ["Период, дней", days],
    ["Поступления, ₽", receipts.reduce((sum, row) => sum + row.amount, 0) / 100],
    ["К оплате, ₽", outstanding / 100],
    ["Активные сделки", state.data.documents.filter((row) => row.domain === "crm" && !["Выиграна", "Проиграна"].includes(row.data.status)).length],
    ["Активные проекты", state.data.documents.filter((row) => row.domain === "projects" && row.data.status !== "Завершён").length],
    [], ["Дата поступления", "Счёт", "Сумма, ₽"],
    ...receipts.map((row) => [row.createdAt, invoices.find((invoice) => invoice.id === row.documentId)?.data.title ?? row.documentId, row.amount / 100]),
  ]));
}

/** Re-authorize export and resolve every requested ID from this workspace's server data. */
export async function getExportDocuments(domain: unknown, ids: unknown): Promise<Result<DocumentRecord[]>> {
  const session = await getSession();
  if (!session.ok) return localizeResult(await session);
  if (!hasPermission(session.data.role, "canExport")) return localizeResult(await err("FORBIDDEN", "Нет права на экспорт данных"));
  const parsedDomain = domainSchema.safeParse(domain);
  const parsedIds = z.array(z.string().min(1).max(200)).max(10_000).safeParse(ids);
  if (!parsedDomain.success || !parsedIds.success) return localizeResult(await err("VALIDATION", "Неверные параметры экспорта (максимум 10 000 записей)"));
  const state = await getWorkspaceState(session.data);
  if (!state.ok) return localizeResult(await state);
  const rows = new Map(state.data.documents.filter((row) => row.domain === parsedDomain.data).map((row) => [row.id, row]));
  const documents: DocumentRecord[] = [];
  for (const id of new Set(parsedIds.data)) {
    const row = rows.get(id);
    if (!row) return localizeResult(await err("NOT_FOUND", "Запись экспорта недоступна. Обновите список"));
    documents.push(row);
  }
  return localizeResult(await ok(documents));
}
