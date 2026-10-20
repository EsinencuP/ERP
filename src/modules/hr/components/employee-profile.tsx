"use client";
import { formatDecimal } from "@/lib/utils";
import { useI18n } from "@/i18n/use-i18n";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, ExternalLink, FileText, GitBranch, Mail, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorPanel } from "@/components/ui/feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { canApproveLeave, canDeleteDocument, canWrite } from "@/lib/permissions";
import type { Result } from "@/types/shared";
import { deleteEmployeeDocumentLink, getEmployeeProfile } from "../actions";
import { getEmployeeDocumentUrl, leaveYearSchema } from "../profile-schema";
import type { EmployeeDocumentLink, EmployeeProfile as Profile } from "../types";
import { EmployeeAvatar, EmployeeStatusBadge } from "./employee-presentation";
import { EmployeeFormSheet } from "./employee-form-sheet";
import { EmployeeAllowanceForm, EmployeeDocumentForm } from "./employee-profile-forms";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  const { t } = useI18n();
 return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{t(label)}</dt><dd className="mt-2 break-words text-sm">{children || t("Не указано")}</dd></div>; }

/** Display a live employee profile, document references, reporting line and year-specific annual leave balance. */
export function EmployeeProfile({ employeeId, initialData }: { employeeId: string; initialData: Result<Profile> }) {
  const { t , locale: uiLocale, count, localeTag: uiLocaleTag } = useI18n();

  const router = useRouter(), { role } = usePermissions(), [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false), [form, setForm] = useState<"employee" | "document" | "allowance" | null>(null), [editingDocument, setEditingDocument] = useState<EmployeeDocumentLink | null>(null), [deleting, setDeleting] = useState<EmployeeDocumentLink | null>(null);
  const [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false), [error, setError] = useState(""), [yearInput, setYearInput] = useState(initialData.ok ? String(initialData.data.leaveBalance.year) : ""), [yearError, setYearError] = useState("");
  const saving = useRef(false), reading = useRef(false), pendingFocus = useRef(false), focus = useRef<HTMLElement | null>(null), refreshButton = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!loading && pendingFocus.current) { pendingFocus.current = false; refreshButton.current?.focus({ preventScroll: true }); }
  }, [loading]);
  const occupied = loading || form !== null || deleting !== null || busy;
  function handleCapture() { focus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }
  function handleReturn() { if (reading.current) { pendingFocus.current = true; return; } const previous = focus.current; if (previous?.isConnected && !previous.matches(":disabled")) previous.focus({ preventScroll: true }); else refreshButton.current?.focus({ preventScroll: true }); }
  async function handleLoad(year?: number, documentsPage?: number) {
    if (reading.current) return; reading.current = true; setLoading(true);
    const filters = { ...(year !== undefined ? { year } : data.ok ? { year: data.data.leaveBalance.year } : {}), documentsPage: documentsPage ?? (data.ok ? data.data.documents.page : 1) };
    try {
      let result = await getEmployeeProfile(employeeId, filters);
      if (result.ok && result.data.documents.page > Math.max(1, result.data.documents.totalPages)) result = await getEmployeeProfile(employeeId, { ...filters, documentsPage: Math.max(1, result.data.documents.totalPages) });
      setData(result); if (result.ok) setYearInput(String(result.data.leaveBalance.year));
    } catch { setData({ ok: false, error: { code: "STORAGE", message: t("Не удалось загрузить профиль. Обновите данные") } }); }
    finally { reading.current = false; setLoading(false); }
  }
  function handleRefresh() { void handleLoad(); router.refresh(); }
  function handleSaved() { setForm(null); setEditingDocument(null); handleRefresh(); }
  function handleClose(reload = false) { setForm(null); setEditingDocument(null); if (reload) handleRefresh(); }
  function handleCloseDelete() { if (saving.current) return; setDeleting(null); if (blocked) handleRefresh(); setBlocked(false); setError(""); }
  async function handleDelete() {
    if (!deleting || saving.current || blocked) return; saving.current = true; setBusy(true);
    try {
      const result = await deleteEmployeeDocumentLink(deleting.id, deleting.version);
      if (!result.ok) { setError(result.error.message); setBlocked(result.error.code !== "VALIDATION"); return; }
      toast.success(t("Ссылка удалена")); setDeleting(null); handleRefresh();
    } catch { setError(t("Результат удаления неизвестен. Закройте окно и обновите профиль")); setBlocked(true); }
    finally { saving.current = false; setBusy(false); }
  }
  const profile = data.ok ? data.data : null;
  return <section className="motion-fade min-w-0 space-y-6" aria-label={t("Профиль сотрудника")}>
    <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="ghost" size="sm"><Link href="/hr"><ArrowLeft />{t("К сотрудникам")}</Link></Button><Button ref={refreshButton} variant="outline" size="icon" aria-label={t("Обновить профиль")} disabled={occupied} onClick={handleRefresh}><RefreshCw /></Button></div>
    {loading ? <div role="status" aria-label={t("Загрузка профиля")} className="space-y-6"><Skeleton className="h-36" /><div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-96 lg:col-span-2" /><Skeleton className="h-80" /></div></div> : !data.ok ? <ErrorPanel error={data.error} /> : profile && <>
      <header className="motion-fade panel flex flex-wrap items-center justify-between gap-5 p-5 sm:p-7"><div className="flex min-w-0 items-center gap-4"><EmployeeAvatar name={profile.employee.name} /><div className="min-w-0"><p className="eyebrow mb-2">{t("HR / Employee profile")}</p><h1 className="break-words text-2xl font-semibold sm:text-3xl">{profile.employee.name}</h1><p className="mt-2 break-words text-sm text-muted-foreground">{profile.employee.position || t("Должность не указана")}</p><div className="mt-3 flex flex-wrap items-center gap-3"><EmployeeStatusBadge status={profile.employee.status} /><span className="break-all font-mono text-xs text-muted-foreground">{profile.employee.employeeId}</span></div></div></div>{canWrite(role) && <Button variant="outline" disabled={occupied} onClick={function handleEditEmployee() { handleCapture(); setForm("employee"); }}><Pencil />{t("Редактировать профиль")}</Button>}</header>
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <section aria-labelledby="profile-personal" className="motion-fade panel p-5 sm:p-6"><h2 id="profile-personal" className="text-base font-semibold">{t("Личные данные")}</h2><dl className="mt-6 grid gap-6 sm:grid-cols-2"><Detail label={t("Имя и фамилия")}>{profile.employee.name}</Detail><Detail label={t("Табельный номер")}><span className="font-mono">{profile.employee.employeeId}</span></Detail><Detail label={t("Отдел")}>{profile.employee.department}</Detail><Detail label={t("Должность")}>{profile.employee.position}</Detail><Detail label={t("Дата приёма")}><time dateTime={profile.employee.hireDate}>{new Intl.DateTimeFormat(uiLocaleTag, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${profile.employee.hireDate}T00:00:00Z`))}</time></Detail></dl></section>
          <section aria-labelledby="profile-contact" className="motion-fade panel p-5 sm:p-6"><h2 id="profile-contact" className="flex items-center gap-2 text-base font-semibold"><Mail className="size-4 text-muted-foreground" />{t("Контакты")}</h2><dl className="mt-6 grid gap-6 sm:grid-cols-2"><Detail label={t("Рабочий email")}>{profile.employee.email ? <a className="break-all text-primary hover:underline" href={`mailto:${profile.employee.email}`}>{profile.employee.email}</a> : null}</Detail><Detail label={t("Рабочий телефон")}>{profile.employee.phone}</Detail></dl></section>
          <section aria-labelledby="profile-documents" className="motion-fade panel overflow-hidden"><header className="flex flex-wrap items-center justify-between gap-3 border-b p-5 sm:p-6"><div><h2 id="profile-documents" className="flex items-center gap-2 text-base font-semibold"><FileText className="size-4 text-muted-foreground" />{t("Документы")}</h2><p className="mt-2 text-xs text-muted-foreground">{t("Именованные ссылки на файлы · ")}{profile.documents.total}</p></div>{canWrite(role) && <Button variant="outline" size="sm" disabled={occupied} onClick={function handleAddDocument() { handleCapture(); setEditingDocument(null); setForm("document"); }}><Plus />{t("Добавить документ")}</Button>}</header>
            {profile.documents.total === 0 ? <EmptyState title={t("Документов пока нет")} description={t("Добавьте ссылку на файл в вашем хранилище.")} /> : <ul className="divide-y">{profile.documents.data.map((item) => { const url = getEmployeeDocumentUrl(item.url); return <li key={item.id} className="motion-fade flex items-start justify-between gap-3 p-5 sm:px-6"><div className="min-w-0">{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-start gap-2 break-words text-sm font-medium text-primary hover:underline">{item.title}<ExternalLink className="mt-0.5 size-3.5 shrink-0" /><span className="sr-only">{t("(новая вкладка)")}</span></a> : <p className="break-words text-sm">{item.title} {t(" · Некорректная ссылка")}</p>}<p className="mt-2 break-all text-[11px] text-muted-foreground">{url ? new URL(url).hostname : t("Обновите ссылку на документ")}</p>{item.notes && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">{item.notes}</p>}</div><div className="flex shrink-0 gap-1">{canWrite(role) && <Button size="icon" variant="ghost" disabled={occupied} aria-label={t`Редактировать документ ${item.title}`} onClick={function handleEditDocument() { handleCapture(); setEditingDocument(item); setForm("document"); }}><Pencil /></Button>}{canDeleteDocument(role, "hr") && <Button size="icon" variant="ghost" disabled={occupied} aria-label={t`Удалить документ ${item.title}`} onClick={function handleAskDelete() { setDeleting(item); setError(""); setBlocked(false); }}><Trash2 /></Button>}</div></li>; })}</ul>}
            {profile.documents.totalPages > 1 && <footer className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs text-muted-foreground"><span>{t("Страница ")}{profile.documents.page} / {profile.documents.totalPages}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={occupied || profile.documents.page <= 1} onClick={function handlePrevious() { void handleLoad(undefined, profile.documents.page - 1); }}>{t("Назад")}</Button><Button variant="outline" size="sm" disabled={occupied || profile.documents.page >= profile.documents.totalPages} onClick={function handleNext() { void handleLoad(undefined, profile.documents.page + 1); }}>{t("Далее")}</Button></div></footer>}
          </section>
        </div>
        <aside className="min-w-0 space-y-6">
          <section aria-labelledby="profile-leave" className="motion-fade panel p-5 sm:p-6"><h2 id="profile-leave" className="flex items-center gap-2 text-base font-semibold"><CalendarDays className="size-4 text-muted-foreground" />{t("Баланс отпуска")}</h2><form className="mt-5 flex items-end gap-2" noValidate onSubmit={function handleYear(event) { event.preventDefault(); if (occupied) return; const result = /^\d{4}$/.test(yearInput) ? leaveYearSchema.safeParse(Number(yearInput)) : null; if (!result?.success) { setYearError(t("Укажите год от 1900 до 9999")); return; } setYearError(""); void handleLoad(result.data); }}><div className="min-w-0 flex-1"><label htmlFor="profile-leave-year" className="mb-2 block text-xs text-muted-foreground">{t("Календарный год")}</label><Input id="profile-leave-year" value={yearInput} inputMode="numeric" maxLength={4} disabled={occupied} onChange={function handleYearInput(event) { setYearInput(event.target.value); }} aria-invalid={Boolean(yearError)} aria-describedby="profile-year-error" /></div><Button type="submit" variant="outline" disabled={occupied}>{t("Показать")}</Button></form>{yearError && <p id="profile-year-error" role="alert" className="mt-2 text-xs text-destructive">{t(yearError)}</p>}
            <div className="my-6 rounded-xl bg-muted p-4"><p className="text-xs text-muted-foreground">{t("Остаток · ")}{profile.leaveBalance.year}</p><p className={`mt-2 break-words font-mono text-3xl font-medium ${profile.leaveBalance.remaining?.startsWith("-") ? "text-destructive" : "text-foreground"}`}>{profile.leaveBalance.remaining === null ? t("Не задан") : formatDecimal(profile.leaveBalance.remaining, uiLocale)}</p>{profile.leaveBalance.remaining !== null && <p className="mt-1 text-xs text-muted-foreground">{count(Number(profile.leaveBalance.remaining), "workingDay", false)}</p>}</div>
            <dl className="space-y-4"><Detail label={t("Годовой лимит")}>{profile.leaveBalance.allowance ? formatDecimal(profile.leaveBalance.allowance.days, uiLocale) : t("Не задан")}</Detail><Detail label={t("Одобрено, включая будущие отпуска")}>{count(Number(profile.leaveBalance.approved), "workingDay")}</Detail><Detail label={t("Ожидает согласования")}>{count(Number(profile.leaveBalance.pending), "workingDay")}</Detail></dl><p className="mt-5 text-xs leading-relaxed text-muted-foreground">{t("Ежегодный отпуск. Суббота и воскресенье исключены. Ожидающие заявки не уменьшают остаток. Перенос между годами и начисления не учитываются.")}</p>{canApproveLeave(role) && <Button variant="outline" className="mt-5 w-full" disabled={occupied} onClick={function handleAllowance() { handleCapture(); setForm("allowance"); }}><Pencil />{profile.leaveBalance.allowance ? t("Изменить лимит") : t("Назначить лимит")}</Button>}<Button asChild variant="ghost" className="mt-2 w-full"><Link href="/hr/leaves">{t("К заявкам на отпуск")}</Link></Button>
          </section>
          <section aria-labelledby="profile-manager" className="motion-fade panel p-5 sm:p-6"><h2 id="profile-manager" className="text-base font-semibold">{t("Руководитель")}</h2>{profile.manager ? <div className="mt-5 space-y-4"><div className="flex items-start gap-3"><EmployeeAvatar name={profile.manager.name} /><div className="min-w-0"><Link href={`/hr/${profile.manager.id}`} className="break-words text-sm font-medium text-primary hover:underline">{profile.manager.name}</Link><p className="mt-1 break-words text-xs text-muted-foreground">{profile.manager.position || t("Должность не указана")}</p><p className="mt-1 break-words text-xs text-muted-foreground">{profile.manager.department || t("Отдел не указан")}</p></div></div><EmployeeStatusBadge status={profile.manager.status} /></div> : <p className="mt-5 text-sm text-muted-foreground">{t("Руководитель не назначен")}</p>}<Button asChild variant="outline" className="mt-5 w-full"><Link href="/hr/org-chart"><GitBranch />{t("Оргструктура")}</Link></Button></section>
        </aside>
      </div>
    </>}
    {profile && form === "employee" && <EmployeeFormSheet employee={profile.employee} onSaved={handleSaved} onClose={handleClose} onReload={handleRefresh} onReturnFocus={handleReturn} />}
    {profile && form === "document" && <EmployeeDocumentForm employeeId={employeeId} {...(editingDocument ? { document: editingDocument } : {})} onSaved={handleSaved} onClose={handleClose} onReturnFocus={handleReturn} />}
    {profile && form === "allowance" && <EmployeeAllowanceForm employeeId={employeeId} year={profile.leaveBalance.year} allowance={profile.leaveBalance.allowance} onSaved={handleSaved} onClose={handleClose} onReturnFocus={handleReturn} />}
    {deleting && <ConfirmDialog title={t`Удалить ссылку «${deleting.title}»?`} description={t("Ссылка исчезнет из профиля. Сам файл останется в вашем хранилище.")} busy={busy} error={error} disabled={blocked} onClose={handleCloseDelete} onConfirm={handleDelete} />}
  </section>;
}
