import { NextResponse } from "next/server";
import { getFinanceContext } from "@/modules/finance/access";
import { getInvoice } from "@/modules/finance/queries";
import { createInvoicePdf } from "@/modules/finance/pdf";
import { hasPermission } from "@/lib/permissions";
import { err } from "@/lib/errors";
import type { AppError } from "@/types/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
function handleError(result: { ok: false; error: AppError }) {
  const status = result.error.code === "UNAUTHORIZED" ? 401 : result.error.code === "FORBIDDEN" ? 403 : result.error.code === "NOT_FOUND" ? 404 : result.error.code === "VALIDATION" ? 400 : 503;
  return NextResponse.json(result, { status, headers: privateHeaders });
}
/** Export an invoice only for an authenticated MANAGER+ inside its workspace, without caching PII. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getFinanceContext();
  if (!context.ok) return handleError(context);
  if (!hasPermission(context.data.role, "canExport")) return handleError(err("FORBIDDEN", "Недостаточно прав для экспорта PDF"));
  const { id } = await params, invoice = await getInvoice(id);
  if (!invoice.ok) return handleError(invoice);
  const pdf = await createInvoicePdf(invoice.data);
  if (!pdf.ok) return handleError(pdf);
  return new NextResponse(new Blob([pdf.data as Uint8Array<ArrayBuffer>], { type: "application/pdf" }), { headers: { ...privateHeaders, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${invoice.data.number.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf"` } });
}
