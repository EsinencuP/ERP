import type { Translator } from "@/i18n/translate";
import { STOCK_MOVEMENT_LABELS } from "@/modules/inventory/presentation";
/** Localize recognized system-generated audit titles; entity metadata protects arbitrary user titles. */
export function getAuditTitle(event: { title: string; entityType?: string | null }, t: Translator): string {
  if (event.entityType === "Leave" && event.title.startsWith("Отпуск · ")) return t`Отпуск · ${event.title.slice(9)}`;
  if (event.entityType === "LeaveAllowance" && /^Лимит отпуска · \d{4}$/.test(event.title)) return t(event.title);
  if (event.entityType === "StockMovement") {
    const [code, ...rest] = event.title.split(" · ");
    if (code && Object.hasOwn(STOCK_MOVEMENT_LABELS, code) && rest.length) return t(STOCK_MOVEMENT_LABELS[code as keyof typeof STOCK_MOVEMENT_LABELS]) + " · " + rest.join(" · ");
  }
  return event.title;
}
