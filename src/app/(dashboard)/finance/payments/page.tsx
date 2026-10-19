import { getPayments } from "@/modules/finance/payment-queries";
import { PaymentTable } from "@/modules/finance/components/payment-table";
import { FinanceNavigation } from "@/modules/finance/components/invoice-presentation";

/** Load the authorized normalized payment register on the server. */
export default async function Page() { return <><FinanceNavigation section="payments" /><PaymentTable initialData={await getPayments()} /></>; }
