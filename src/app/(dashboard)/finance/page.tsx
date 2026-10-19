import { getInvoices } from "@/modules/finance/queries";
import { InvoiceTable } from "@/modules/finance/components/invoice-table";
import { FinanceNavigation } from "@/modules/finance/components/invoice-presentation";

/** Load the authenticated finance workspace. */
export default async function Page() { return <><FinanceNavigation /><InvoiceTable initialData={await getInvoices()} /></>; }
