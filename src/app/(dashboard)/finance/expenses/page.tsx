import { financeRecordIdSchema } from "@/modules/finance/schema";
import { getExpenses } from "@/modules/finance/expense-queries";
import { ExpenseTable } from "@/modules/finance/components/expense-table";
import { FinanceNavigation } from "@/modules/finance/components/invoice-presentation";

/** Load normalized expenses only after server-side workspace authorization. */
export default async function Page({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) { const { projectId } = await searchParams, parsed = financeRecordIdSchema.safeParse(projectId); return <><FinanceNavigation section="expenses" /><ExpenseTable key={projectId ?? "all"} initialProjectId={parsed.success ? parsed.data : ""} initialData={await getExpenses(projectId === undefined ? {} : { projectId })} /></>; }
