import { ExternalLink } from "lucide-react";
import { getExpenseReceiptUrl } from "../schema";
import type { ExpenseCategory } from "../types";

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  OFFICE: "Офис", SOFTWARE: "ПО и подписки", TRAVEL: "Командировки", MARKETING: "Маркетинг",
  EQUIPMENT: "Оборудование", RENT: "Аренда", UTILITIES: "Коммунальные услуги", OTHER: "Прочее",
};

/** Open a validated receipt only on explicit user navigation, without fetching it on the server. */
export function ExpenseReceiptLink({ receipt }: { receipt: string | null }) {
  const url = getExpenseReceiptUrl(receipt);
  return url ? <a href={url} target="_blank" rel="noopener noreferrer" className="motion-fade inline-flex items-center gap-1 rounded text-xs text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><ExternalLink className="size-3" />Открыть чек<span className="sr-only"> в новой вкладке</span></a> : <span className="text-xs text-muted-foreground">—</span>;
}
