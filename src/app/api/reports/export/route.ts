import { localizeResult } from "@/i18n/server";
import { NextResponse } from "next/server";
import { serializeCsv } from "@/lib/export";
import { err } from "@/lib/errors";
import { getPnlExport } from "@/modules/finance/reports";
import { pnlExportSchema } from "@/modules/finance/schema";
import type { AppError } from "@/types/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
async function handleError(result: { ok: false; error: AppError }) {
  const status = result.error.code === "UNAUTHORIZED" ? 401 : result.error.code === "FORBIDDEN" ? 403 : result.error.code === "VALIDATION" ? 400 : 503;
  return NextResponse.json(await localizeResult(result), { status, headers: privateHeaders });
}

/** Download a fresh tenant-scoped P&L CSV; reject unknown/duplicate query keys and enforce live canExport. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (Array.from(params.keys()).some((key) => params.getAll(key).length !== 1)) return handleError(err("VALIDATION", "Параметры отчёта не должны повторяться"));
  const parsed = pnlExportSchema.safeParse(Object.fromEntries(params));
  if (!parsed.success) return handleError(err("VALIDATION", "Укажите type=pnl, даты from/to и валюту RUB, USD или EUR"));
  const { from, to, currency } = parsed.data, result = await getPnlExport({ from, to, currency });
  if (!result.ok) return handleError(result);
  return new NextResponse(serializeCsv(result.data), { headers: { ...privateHeaders, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="evo-pnl-${currency}-${from}-${to}.csv"` } });
}
