import { FinanceDashboard } from "@/modules/finance/components/finance-dashboard";
import { FinanceNavigation } from "@/modules/finance/components/invoice-presentation";
import { getFinanceDashboard } from "@/modules/finance/analytics";

/** Preserve the complete finance KPI, aging, invoice status and top-client overview on its own module route. */
export default async function Page() { return <><FinanceNavigation section="dashboard" /><FinanceDashboard initialData={await getFinanceDashboard()} /></>; }
