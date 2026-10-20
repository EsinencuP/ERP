"use client";
import { useI18n } from "@/i18n/use-i18n";


import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, Building2, ChevronLeft, ChevronRight, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RelativeTime } from "@/components/ui/relative-time";
import type { PaginatedResponse } from "@/types/shared";
import { formatCurrency } from "@/lib/utils";
import type { ContactTableRow, Deal } from "../types";
import { PIPELINE_STAGES } from "../pipeline";
import { ContactAssigneeAvatar } from "./contact-presentation";

/** Present contact data with working email and telephone links and safe empty values. */
export function ContactInfo({ contact, now }: { contact: ContactTableRow; now: string }) {
  const { t } = useI18n();

  return <section className="motion-fade panel min-w-0 p-5" aria-labelledby="contact-info-title"><h2 id="contact-info-title" className="text-sm font-semibold">{t("О контакте")}</h2><dl className="mt-5 space-y-5 text-xs"><div><dt className="mb-1.5 flex items-center gap-2 text-[11px] text-muted-foreground"><Building2 className="size-3.5" />{t("Компания")}</dt><dd className="break-words">{contact.company || t("Не указана")}</dd></div><div><dt className="mb-1.5 flex items-center gap-2 text-[11px] text-muted-foreground"><Mail className="size-3.5" />{t("Email")}</dt><dd className="break-all">{contact.email ? <a href={`mailto:${contact.email}`} className="hover:text-primary hover:underline">{contact.email}</a> : t("Не указан")}</dd></div><div><dt className="mb-1.5 flex items-center gap-2 text-[11px] text-muted-foreground"><Phone className="size-3.5" />{t("Телефон")}</dt><dd className="break-words">{contact.phone ? <a href={`tel:${contact.phone}`} className="hover:text-primary hover:underline">{contact.phone}</a> : t("Не указан")}</dd></div><div><dt className="mb-1.5 flex items-center gap-2 text-[11px] text-muted-foreground"><MapPin className="size-3.5" />{t("Адрес")}</dt><dd className="break-words">{contact.address || t("Не указан")}</dd></div><div><dt className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground"><UserRound className="size-3.5" />{t("Ответственный")}</dt><dd><ContactAssigneeAvatar owner={contact.owner} /></dd></div><div className="border-t pt-4"><dt className="mb-1.5 text-[11px] text-muted-foreground">{t("Контакт создан")}</dt><dd><RelativeTime value={contact.createdAt} now={now} /></dd></div></dl>{contact.notes && <div className="mt-5 border-t pt-4"><h3 className="text-[11px] text-muted-foreground">{t("Комментарий")}</h3><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed">{contact.notes}</p></div>}</section>;
}

/** Read related deals as bounded pages without presenting an unrelated currency sum. */
export function ContactDeals({ page, disabled, onPage }: { page: PaginatedResponse<Deal>; disabled: boolean; onPage: (page: number) => void }) {
  const { t , locale: uiLocale } = useI18n();

  return <section className="motion-fade panel min-w-0 p-5" aria-labelledby="contact-deals-title"><header className="flex items-center justify-between gap-3"><h2 id="contact-deals-title" className="flex items-center gap-2 text-sm font-semibold"><BriefcaseBusiness className="size-4 text-muted-foreground" />{t("Сделки ")}<span className="font-mono text-xs text-muted-foreground">{page.total}</span></h2><Link href="/crm/pipeline" className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary">{t("Воронка")}<ArrowUpRight className="size-3" /></Link></header><ul className="mt-4 space-y-3">{page.data.map((deal) => <li key={deal.id} className="rounded-xl border p-3" data-related-deal={deal.id}><h3 className="break-words text-xs font-medium leading-relaxed">{deal.title}</h3><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="break-words font-mono text-xs tabular-nums">{formatCurrency(deal.value, deal.currency, uiLocale)}</span><Badge variant="outline">{t(PIPELINE_STAGES[deal.stage].label)}</Badge></div></li>)}</ul>{!page.total && <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{t("Связанных сделок пока нет.")}</p>}{page.totalPages > 1 && <footer className="mt-4 flex items-center justify-between gap-2 border-t pt-4"><span className="text-[10px] text-muted-foreground">{page.data.length} {t(" из ")}{page.total}</span><div className="flex items-center gap-1"><Button variant="ghost" size="icon" aria-label={t("Предыдущая страница сделок контакта")} disabled={disabled || page.page <= 1} onClick={function handlePreviousPage() { onPage(page.page - 1); }}><ChevronLeft /></Button><span className="font-mono text-[10px] text-muted-foreground">{page.page} / {page.totalPages}</span><Button variant="ghost" size="icon" aria-label={t("Следующая страница сделок контакта")} disabled={disabled || page.page >= page.totalPages} onClick={function handleNextPage() { onPage(page.page + 1); }}><ChevronRight /></Button></div></footer>}</section>;
}
