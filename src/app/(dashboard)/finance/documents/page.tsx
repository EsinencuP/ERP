import { ModulePage } from "@/components/blocks/module-page";
import { FinanceNavigation } from "@/modules/finance/components/invoice-presentation";
/** Preserve the existing Document invoices and payments without implicit migration. */
export default function Page() { return <><FinanceNavigation legacy /><ModulePage domain="finance" /></>; }
