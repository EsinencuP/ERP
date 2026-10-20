
import { useI18n } from "@/i18n/use-i18n";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";
import type { EmployeeStatus } from "../types";

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = { ACTIVE: "Работает", ON_LEAVE: "В отпуске", TERMINATED: "Неактивен" };
/** Render an employee's initials through the shared accessible avatar primitive. */
export function EmployeeAvatar({ name }: { name: string }) { return <Avatar aria-hidden="true" className="size-11 border border-primary/15"><AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">{initials(name)}</AvatarFallback></Avatar>; }
/** Display an HR status with text and a semantic color. */
export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) { return <Badge status={EMPLOYEE_STATUS_LABELS[status]} className="whitespace-nowrap" />; }
/** Navigate normalized employees, their hierarchy and the separate legacy registry. */
export function HrNavigation({ section = "directory" }: { section?: "directory" | "org" | "leaves" | "legacy" }) {
  const { t } = useI18n();

  return <nav aria-label={t("Разделы команды")} className="motion-fade mb-6 flex w-fit max-w-full flex-wrap gap-1 rounded-xl border p-1 text-xs">{[{ href: "/hr", label: t("Сотрудники"), key: "directory" }, { href: "/hr/org-chart", label: t("Оргструктура"), key: "org" }, { href: "/hr/leaves", label: t("Отпуска"), key: "leaves" }, { href: "/hr/documents", label: t("Прежний реестр"), key: "legacy" }].map((item) => <Link key={item.href} href={item.href} aria-current={item.key === section ? "page" : undefined} className={`rounded-lg px-3 py-2 ${item.key === section ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>{t(item.label)}</Link>)}</nav>;
}
