
import { useI18n } from "@/i18n/use-i18n";
import Link from "next/link";
import { EmptyState } from "@/components/ui/feedback";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import { InvoiceStatusBadge } from "./invoice-presentation";
import type { FinanceDashboardData } from "../types";

/** Show the five most recently created invoices in the selected currency, including derived payment states. */
export function RecentInvoices({ invoices, currency }: { invoices: FinanceDashboardData["recentInvoices"]; currency: string }) {
  const { t , locale: uiLocale } = useI18n();

  return (
      <section className="motion-fade panel min-w-0 overflow-hidden" aria-labelledby="recent-invoices-title"><header className="flex items-center justify-between gap-3 p-5"><div><h2 id="recent-invoices-title" className="text-sm font-semibold">{t("Последние счета")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("По дате создания · до 5 · ")}{currency}</p></div><Link href="/finance" className="text-xs text-primary hover:underline">{t("Все счета →")}</Link></header><Table className="min-w-[650px]"><TableHeader><TableRow><TableHead className="pl-5">{t("Счёт / клиент")}</TableHead><TableHead>{t("Оплатить до")}</TableHead><TableHead>{t("Статус")}</TableHead><TableHead className="text-right">{t("Итого")}</TableHead><TableHead className="pr-5 text-right">{t("Остаток")}</TableHead></TableRow></TableHeader><TableBody>{invoices.map((invoice) => <TableRow key={invoice.id}><TableCell className="pl-5"><Link href={`/finance/${invoice.id}`} className="font-mono text-xs text-primary hover:underline">{invoice.number}</Link><span className="mt-1 block max-w-52 truncate text-xs text-muted-foreground">{invoice.customerName}</span></TableCell><TableCell className="text-xs">{formatDateOnly(invoice.dueDate, uiLocale)}</TableCell><TableCell><InvoiceStatusBadge status={invoice.status} /></TableCell><TableCell className="text-right font-mono text-xs">{formatCurrency(invoice.total, currency, uiLocale)}</TableCell><TableCell className="pr-5 text-right font-mono text-xs">{invoice.status === "DRAFT" || invoice.status === "CANCELLED" ? "—" : formatCurrency(invoice.balance, currency, uiLocale)}</TableCell></TableRow>)}</TableBody></Table>{!invoices.length && <EmptyState title={t("Счетов пока нет")} description={t("Новый счёт можно создать в разделе финансов.")} />}</section>
  );
}
