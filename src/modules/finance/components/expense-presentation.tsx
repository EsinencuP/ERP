
import { useI18n } from "@/i18n/use-i18n";
import { ExternalLink } from "lucide-react";
import { getExpenseReceiptUrl } from "../schema";


export { EXPENSE_CATEGORY_LABELS } from "../presentation";

/** Open a validated receipt only on explicit user navigation, without fetching it on the server. */
export function ExpenseReceiptLink({ receipt }: { receipt: string | null }) {
  const { t } = useI18n();

  const url = getExpenseReceiptUrl(receipt);
  return url ? <a href={url} target="_blank" rel="noopener noreferrer" className="motion-fade inline-flex items-center gap-1 rounded text-xs text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><ExternalLink className="size-3" />{t("Открыть чек")}<span className="sr-only"> {t(" в новой вкладке")}</span></a> : <span className="text-xs text-muted-foreground">—</span>;
}
