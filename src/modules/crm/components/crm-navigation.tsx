import Link from "next/link";
import { cn } from "@/lib/utils";

/** Keep normalized contacts and the existing deals screen reachable within CRM. */
export function CrmNavigation({ active }: { active: "contacts" | "deals" | "pipeline" }) {
  return <nav aria-label="Разделы CRM" className="motion-fade mb-7 flex w-fit max-w-full flex-wrap gap-1 rounded-xl border bg-surface p-1">
    {([{ href: "/crm/contacts", key: "contacts", label: "Контакты" }, { href: "/crm/pipeline", key: "pipeline", label: "Воронка" }, { href: "/crm", key: "deals", label: "Сделки" }] as const).map((item) => <Link key={item.key} href={item.href} aria-current={active === item.key ? "page" : undefined} className={cn("rounded-lg px-4 py-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring", active === item.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>{item.label}</Link>)}
  </nav>;
}
