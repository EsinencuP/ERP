import Link from "next/link";
import { useI18n } from "@/i18n/use-i18n";
/** Keep personal preferences and administrator-only sections in one settings navigation. */
export function SettingsNavigation({ section, admin }: { section: "general" | "users" | "audit"; admin: boolean }) {
  const { t } = useI18n();
  const items = [{ key: "general", href: "/settings", label: "Preferences" }, ...(admin ? [{ key: "users", href: "/settings/users", label: "Members" }, { key: "audit", href: "/settings/audit", label: "Audit log" }] : [])];
  return <nav aria-label={t("Settings sections")} className="motion-fade mb-6 flex w-fit max-w-full flex-wrap gap-1 rounded-xl border p-1 text-xs">{items.map((item) => <Link key={item.key} href={item.href} aria-current={section === item.key ? "page" : undefined} className={`rounded-lg px-3 py-2 ${section === item.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>{t(item.label)}</Link>)}</nav>;
}
