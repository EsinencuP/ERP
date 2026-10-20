
import { useI18n } from "@/i18n/use-i18n";
import Link from "next/link";

/** Keep normalized task work and the preserved document registry separate. */
export function ProjectNavigation({ legacy = false, section = "tasks" }: { legacy?: boolean; section?: "tasks" | "overview" }) {
  const { t } = useI18n();
 return <nav aria-label={t("Разделы проектов")} className="motion-fade mb-6 flex w-fit max-w-full gap-1 rounded-xl border p-1 text-xs">{[{ href: "/projects/overview", label: t("Обзор"), active: !legacy && section === "overview" }, { href: "/projects", label: t("Задачи"), active: !legacy && section === "tasks" }, { href: "/projects/documents", label: t("Прежний реестр"), active: legacy }].map((item) => <Link key={item.href} href={item.href} aria-current={item.active ? "page" : undefined} className={`rounded-lg px-3 py-2 ${item.active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>{t(item.label)}</Link>)}</nav>; }
