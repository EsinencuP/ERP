"use client";
import { useAppFormat } from "@/modules/settings/configuration-provider";
import { formatDecimal } from "@/lib/utils";
import { useI18n } from "@/i18n/use-i18n";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/feedback";
import { updateLeaveStatus } from "../actions";
import type { Leave } from "../types";
import { LEAVE_TYPE_LABELS, LeaveStatusBadge } from "./leave-presentation";

/** Show the complete application and let authorized managers decide its captured PENDING version once. */
export function LeaveDetailDialog({ leave: initial, approver, onClose, onSaved, onReturnFocus }: { leave: Leave; approver: boolean; onClose: (reload?: boolean) => void; onSaved: () => void; onReturnFocus: () => void }) {
  const { formatDateOnly } = useAppFormat();
  const { t, locale: uiLocale } = useI18n();

  const leave = useRef(initial).current, saving = useRef(false), [pending, setPending] = useState<"APPROVED" | "REJECTED" | null>(null), [error, setError] = useState(""), [blocked, setBlocked] = useState(false);
  function handleClose() { if (!saving.current) onClose(blocked); }
  async function handleDecision(status: "APPROVED" | "REJECTED") { if (saving.current || blocked) return; saving.current = true; setPending(status); try { const result = await updateLeaveStatus(leave.id, leave.version, status); if (!result.ok) { setError(result.error.message); setBlocked(true); toast.error(t(result.error.message)); return; } toast.success(t(status === "APPROVED" ? t("Отпуск одобрен") : t("Заявка отклонена"))); onSaved(); } catch { setError(t("Результат решения неизвестен. Закройте окно и обновите список")); setBlocked(true); } finally { saving.current = false; setPending(null); } }
  return <Dialog open onOpenChange={function handleOpen(open) { if (!open) handleClose(); }}><DialogContent onEscapeKeyDown={function handleEscape(event) { if (saving.current) event.preventDefault(); }} onInteractOutside={function handleOutside(event) { if (saving.current) event.preventDefault(); }} onCloseAutoFocus={function handleReturn(event) { event.preventDefault(); onReturnFocus(); }}><DialogTitle className="pr-6 text-lg font-medium">{t("Заявка на отпуск")}</DialogTitle><DialogDescription className="mt-2 break-words text-sm">{leave.employee.name} · {leave.employee.employeeId}</DialogDescription><div className="mt-5 space-y-4"><LeaveStatusBadge status={leave.status} /><dl className="grid grid-cols-2 gap-4 text-xs"><div><dt className="text-muted-foreground">{t("Тип")}</dt><dd className="mt-1">{t(LEAVE_TYPE_LABELS[leave.type])}</dd></div><div><dt className="text-muted-foreground">{t("Рабочих дней")}</dt><dd className="mt-1 font-mono">{formatDecimal(leave.days, uiLocale)}</dd></div><div><dt className="text-muted-foreground">{t("Начало")}</dt><dd className="mt-1">{formatDateOnly(leave.startDate, uiLocale)}</dd></div><div><dt className="text-muted-foreground">{t("Окончание")}</dt><dd className="mt-1">{formatDateOnly(leave.endDate, uiLocale)}</dd></div></dl><div><p className="text-xs text-muted-foreground">{t("Причина")}</p><p className="mt-2 whitespace-pre-wrap break-words rounded-lg border p-3 text-sm">{leave.reason || t("Не указана")}</p></div>{leave.decidedBy && <p className="text-xs text-muted-foreground">{t("Рассмотрел: ")}{leave.decidedBy}</p>}{error && <p role="alert" className="text-xs text-destructive">{t(error)}</p>}<div className="flex flex-wrap justify-end gap-2 border-t pt-4"><Button variant="outline" disabled={pending !== null} onClick={handleClose}>{t("Закрыть")}</Button>{approver && leave.status === "PENDING" && <><Button variant="outline" disabled={pending !== null || blocked} onClick={function handleReject() { void handleDecision("REJECTED"); }}>{pending === "REJECTED" && <Spinner />}{t("Отклонить")}</Button><Button disabled={pending !== null || blocked} onClick={function handleApprove() { void handleDecision("APPROVED"); }}>{pending === "APPROVED" && <Spinner />}{t("Одобрить")}</Button></>}</div></div></DialogContent></Dialog>;
}
