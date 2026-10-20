import { Dashboard } from "@/components/blocks/dashboard";
import { ErrorPanel } from "@/components/ui/feedback";
import { getSession } from "@/lib/auth";
import { unstable_noStore as noStore } from "next/cache";
import { getFinanceDashboard } from "@/modules/finance/analytics";
import { financeCurrencySchema } from "@/modules/finance/schema";
import { getDealDashboard } from "@/modules/crm/analytics";
import { getInventoryStockAlert } from "@/modules/inventory/queries";
import { getLeavePendingCount } from "@/modules/hr/leave-queries";
import { getDashboardActivity } from "@/modules/dashboard/queries";
import { err } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** Load operational summaries and normalized finance concurrently after tenant authentication. */
export default async function Page({ searchParams }: { searchParams: Promise<{ currency?: string }> }) {
  noStore();
  const session = await getSession(); if (!session.ok) return <ErrorPanel error={session.error} />;
  const { currency: input = "RUB" } = await searchParams, parsed = financeCurrencySchema.safeParse(input);
  if (!parsed.success) return <ErrorPanel error={err("VALIDATION", "Выберите валюту RUB, USD или EUR").error} />;
  const [finance, deals, stock, pending, activity] = await Promise.all([getFinanceDashboard(parsed.data), getDealDashboard(), getInventoryStockAlert(), getLeavePendingCount(), getDashboardActivity()]);
  return <Dashboard name={session.data.name} currency={parsed.data} now={new Date().toISOString()} data={{ finance, deals, stock, pending, activity }} />;
}
