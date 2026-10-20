import { formatDateOnly } from "@/lib/utils";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";

import { useI18n } from "@/i18n/use-i18n";
import { Badge } from "@/components/ui/badge";
import type { LeaveStatus, LeaveType } from "../types";

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = { ANNUAL: "Ежегодный", SICK: "Больничный", UNPAID: "Без сохранения оплаты", PARENTAL: "По уходу за ребёнком", OTHER: "Другой" };
export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = { PENDING: "На согласовании", APPROVED: "Одобрена", REJECTED: "Отклонена", CANCELLED: "Отменена (архив)" };
/** Display leave workflow states with text and shared semantic colors. */
export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  const { t } = useI18n();
 const tone = status === "PENDING" ? "border-warning/30 bg-warning/10 text-warning" : status === "APPROVED" ? "border-success/30 bg-success/10 text-success" : status === "REJECTED" ? "border-danger/30 bg-danger/10 text-danger" : "text-muted-foreground"; return <Badge variant="outline" className={`whitespace-nowrap ${tone}`}>{t(LEAVE_STATUS_LABELS[status])}</Badge>; }
/** Format a stored DATE as a calendar label without a timezone shift. */
export function leaveDateLabel(value: string, locale: Locale = DEFAULT_LOCALE): string { return formatDateOnly(value, locale); }
