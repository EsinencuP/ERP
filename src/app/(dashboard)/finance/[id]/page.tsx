
import { getI18n } from "@/i18n/server";
import Link from "next/link";
import { ErrorPanel } from "@/components/ui/feedback";
import { getInvoice } from "@/modules/finance/queries";
import { InvoiceDetail } from "@/modules/finance/components/invoice-detail";
import { FinanceNavigation } from "@/modules/finance/components/invoice-presentation";
/** Render a tenant-scoped normalized invoice and its immutable issued snapshot. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { t } = await getI18n();
 const { id } = await params, result = await getInvoice(id); return <><FinanceNavigation />{result.ok ? <InvoiceDetail key={`${id}:${result.data.version}`} initialData={result.data} /> : <div className="space-y-4"><ErrorPanel error={result.error} /><Link className="text-sm text-primary" href="/finance">{t("Все счета")}</Link></div>}</>; }
