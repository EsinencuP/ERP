import { getExpenses } from "@/modules/finance/expense-queries";
import { ExpenseTable } from "@/modules/finance/components/expense-table";
import { FinanceNavigation } from "@/modules/finance/components/invoice-presentation";

/** Load normalized expenses only after server-side workspace authorization. */
export default async function Page() { return <><FinanceNavigation section="expenses" /><ExpenseTable initialData={await getExpenses()} /></>; }
