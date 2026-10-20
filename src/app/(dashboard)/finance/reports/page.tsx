import { getAppConfiguration } from "@/modules/settings/config-queries";
import { ErrorPanel } from "@/components/ui/feedback";
import { getPnlReport } from "@/modules/finance/reports";
import { getPnlPeriod } from "@/modules/finance/report-periods";
import { PnlReport } from "@/modules/finance/components/pnl-report";
import { FinanceNavigation } from "@/modules/finance/components/invoice-presentation";

/** Load the current calendar month's authorized P&L from normalized PostgreSQL records. */
export default async function Page() {
  const config = await getAppConfiguration(); if (!config.ok) return <ErrorPanel error={config.error} />;
  const filters = { ...getPnlPeriod("month", new Date(), config.data.timezone), currency: "EUR" as const };
  return <><FinanceNavigation section="reports" /><PnlReport initialFilters={filters} initialData={await getPnlReport(filters)} /></>;
}
