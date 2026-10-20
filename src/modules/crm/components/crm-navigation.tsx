
import { useI18n } from "@/i18n/use-i18n";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Keep normalized contacts and the existing deals screen reachable within CRM. */
export function CrmNavigation({ active }: { active: "contacts" | "deals" | "pipeline" }) {
  const { t } = useI18n();

  return <nav aria-label={t("Разделы CRM")} className="motion-fade mb-7 flex w-fit max-w-full flex-wrap gap-1 rounded-xl border bg-surface p-1">
    {([{ href: "/crm/contacts", key: "contacts", label: t("Контакты") }, { href: "/crm/pipeline", key: "pipeline", label: t("Воронка") }, { href: "/crm", key: "deals", label: t("Сделки") }] as const).map((item) => <Link key={item.key} href={item.href} aria-current={active === item.key ? "page" : undefined} className={cn("rounded-lg px-4 py-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring", active === item.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>{t(item.label)}</Link>)}
  </nav>;
}
