"use client";
import { useI18n } from "@/i18n/use-i18n";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FINANCE_CURRENCIES, financeCurrencySchema } from "@/modules/finance/schema";
import type { FinanceCurrency } from "@/modules/finance/types";

/** Refresh the server-rendered dashboard and hide the previous snapshot throughout currency changes and reads. */
export function DashboardFrame({ children, currency, name, now }: { children: ReactNode; currency: FinanceCurrency; name: string; now: string }) {
  const { t , localeTag: uiLocaleTag } = useI18n();

  const [pending, setPending] = useState(false);
  useEffect(() => { function handlePageShow() { setPending(false); } window.addEventListener("pageshow", handlePageShow); return () => window.removeEventListener("pageshow", handlePageShow); }, []);
  function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (pending) return; const parsed = financeCurrencySchema.safeParse(new FormData(event.currentTarget).get("currency")); if (parsed.success) { setPending(true); window.location.assign(`/?currency=${parsed.data}`); } }
  return <div className="min-w-0 space-y-6" aria-busy={pending}><header className="motion-fade flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-3">{t("Workspace / Overview")}</p><h1 className="page-title">{t("Обзор бизнеса")}<span className="text-primary">.</span></h1><p className="mt-2 text-xs text-muted-foreground">{name.split(" ")[0]}{t(", главные показатели вашего пространства.")}</p></div><div className="flex flex-wrap items-center gap-2"><Button asChild variant="outline"><Link href="/finance/dashboard">{t("Финансовая аналитика")}</Link></Button><form action="/" method="get" className="flex items-center gap-2" onSubmit={handleSubmit}><label className="sr-only" htmlFor="dashboard-currency">{t("Валюта dashboard")}</label><select id="dashboard-currency" name="currency" className="input w-auto" defaultValue={currency} disabled={pending} onChange={function handleCurrency(event) { event.currentTarget.form?.requestSubmit(); }}>{FINANCE_CURRENCIES.map((code) => <option key={code}>{code}</option>)}</select><Button type="submit" size="icon" variant="outline" aria-label={t("Обновить dashboard")} disabled={pending}><RefreshCw /></Button></form></div></header>{pending && <div role="status" aria-label={t("Загрузка dashboard")} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((key) => <Skeleton key={key} className="h-36" />)}</div><div className="grid gap-5 xl:grid-cols-2"><Skeleton className="h-96" /><Skeleton className="h-96" /></div></div>}<div hidden={pending} className="min-w-0 space-y-6">{children}</div><p className="motion-fade text-[11px] text-muted-foreground">{t("Обновлено: ")}{new Intl.DateTimeFormat(uiLocaleTag, { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Moscow" }).format(new Date(now))} {t(" МСК · финансовые месяцы и сроки — UTC.")}</p></div>;
}
