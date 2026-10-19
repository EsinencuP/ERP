import { getPnlReport } from "@/modules/finance/reports";
import { getPnlPeriod } from "@/modules/finance/report-periods";
import { PnlReport } from "@/modules/finance/components/pnl-report";
import { FinanceNavigation } from "@/modules/finance/components/invoice-presentation";

/** Load the current calendar month's authorized P&L from normalized PostgreSQL records. */
export default async function Page() {
  const filters = { ...getPnlPeriod("month"), currency: "RUB" as const };
  return <><FinanceNavigation section="reports" /><PnlReport initialFilters={filters} initialData={await getPnlReport(filters)} /></>;
}
