"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ActivityType } from "@prisma/client";
import { ArrowLeft, MoreHorizontal, Pencil, RefreshCw, Trash2, UserRoundCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/feedback";
import { usePermissions } from "@/hooks/usePermissions";
import { canWrite } from "@/lib/permissions";
import { err, ok } from "@/lib/errors";
import { initials } from "@/lib/utils";
import type { AppError, Result } from "@/types/shared";
import { createActivity, deleteContact, getContactActivities, getContactDeals, getContactDetail, updateContact } from "../actions";
import { CONTACT_STAGES } from "../schema";
import type { ContactDetail, ContactTableRow, UpdateContactDTO } from "../types";
import { ActivityComposer, type ActivityComposerValues } from "./activity-composer";
import { ActivityFeed } from "./activity-feed";
import { ContactFormSheet } from "./contact-form-sheet";
import { ContactReassignDialog } from "./contact-reassign-dialog";
import { ContactInfo, ContactDeals } from "./contact-sidebar";
import { ContactTags } from "./contact-tags";
import { CONTACT_STAGE_LABELS, ContactStageBadge } from "./contact-presentation";
import { ContactRecordError } from "./contact-record-error";

type BusyKind = "save" | "delete" | "refresh" | "feed" | "deals" | null;

/** Coordinate the contact header, two-column record layout and versioned activity/contact mutations. */
export function ContactDetailView({ initialData, initialNow }: { initialData: ContactDetail; initialNow: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState(initialData);
  const [now, setNow] = useState(initialNow);
  const [activityType, setActivityType] = useState<ActivityType | null>(null);
  const [busyKind, setBusyKind] = useState<BusyKind>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [error, setError] = useState("");
  const [recordError, setRecordError] = useState<AppError | null>(null);
  const [dialog, setDialog] = useState<"edit" | "assign" | "delete" | null>(null);
  const [editingContact, setEditingContact] = useState<ContactTableRow | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const busy = useRef(false);
  const alive = useRef(true);
  const { role, can } = usePermissions();
  const mayWrite = canWrite(role);
  const locked = busyKind !== null || needsRefresh;
  const contact = detail.contact;
  useEffect(() => { alive.current = true; const timer = window.setInterval(() => setNow(new Date().toISOString()), 60000); return () => { alive.current = false; window.clearInterval(timer); }; }, []);

  function handleReadError(value: AppError) {
    setNeedsRefresh(true); setError(value.message);
    if (["NOT_FOUND", "UNAUTHORIZED", "FORBIDDEN"].includes(value.code)) setRecordError(value);
  }
  async function readFresh(): Promise<boolean> {
    const result = await getContactDetail(contact.id);
    if (!alive.current) return false;
    if (!result.ok) { handleReadError(result.error); return false; }
    setDetail(result.data); setActivityType(null); setNow(new Date().toISOString()); setNeedsRefresh(false); setRecordError(null); return true;
  }
  async function handleRefresh() {
    if (busy.current) return;
    busy.current = true; setBusyKind("refresh"); setError("");
    try { if (await readFresh()) setAnnouncement("Карточка контакта обновлена"); }
    catch { if (alive.current) { setNeedsRefresh(true); setError("Не удалось обновить карточку. Проверьте соединение и повторите запрос"); } }
    finally { busy.current = false; if (alive.current) setBusyKind(null); }
  }
  async function handleSave(operation: () => Promise<Result<unknown>>, message: string): Promise<Result<true>> {
    if (busy.current || locked || !mayWrite) return err("FORBIDDEN", "Действие сейчас недоступно");
    busy.current = true; setBusyKind("save"); setError(""); let committed = false;
    try {
      const result = await operation();
      if (!alive.current) return err("STORAGE", "Страница закрыта. Обновите данные перед повтором");
      if (!result.ok) { setError(result.error.message); if (result.error.code !== "VALIDATION") setNeedsRefresh(true); return result; }
      committed = true; setAnnouncement(message);
      if (!await readFresh() && alive.current) setError(`${message}. Не удалось перечитать карточку; показаны предыдущие данные. Обновите её перед следующей записью`);
      return ok(true);
    } catch {
      if (alive.current) { setNeedsRefresh(true); setError(committed ? `${message}. Не удалось перечитать карточку; обновите её` : "Не удалось подтвердить сохранение. Обновите карточку и проверьте историю перед повтором"); }
      return committed ? ok(true) : err("STORAGE", "Результат сохранения не подтверждён. Обновите карточку");
    } finally { busy.current = false; if (alive.current) setBusyKind(null); }
  }
  async function handleUpdate(input: UpdateContactDTO): Promise<Result<true>> { return handleSave(() => updateContact(contact.id, contact.version, input), "Контакт обновлён"); }
  async function handleCreateActivity(input: ActivityComposerValues): Promise<Result<true>> { return handleSave(() => createActivity({ ...input, contactId: contact.id }), "Активность добавлена"); }
  async function handleFeedPage(page: number, type: ActivityType | null) {
    if (busy.current || locked) return;
    busy.current = true; setBusyKind("feed"); setError("");
    try {
      let result = await getContactActivities(contact.id, { page, ...(type ? { type } : {}) });
      if (result.ok && page > Math.max(1, result.data.totalPages)) result = await getContactActivities(contact.id, { page: Math.max(1, result.data.totalPages), ...(type ? { type } : {}) });
      if (!alive.current) return;
      if (result.ok) { setDetail((current) => ({ ...current, activities: result.data })); setActivityType(type); }
      else handleReadError(result.error);
    } catch { if (alive.current) { setError("Не удалось загрузить ленту. Обновите карточку"); setNeedsRefresh(true); } }
    finally { busy.current = false; if (alive.current) setBusyKind(null); }
  }
  async function handleDealsPage(page: number) {
    if (busy.current || locked) return;
    busy.current = true; setBusyKind("deals"); setError("");
    try {
      let result = await getContactDeals(contact.id, page);
      if (result.ok && page > Math.max(1, result.data.totalPages)) result = await getContactDeals(contact.id, Math.max(1, result.data.totalPages));
      if (!alive.current) return;
      if (result.ok) setDetail((current) => ({ ...current, deals: result.data }));
      else handleReadError(result.error);
    } catch { if (alive.current) { setError("Не удалось загрузить сделки. Обновите карточку"); setNeedsRefresh(true); } }
    finally { busy.current = false; if (alive.current) setBusyKind(null); }
  }
  async function handleDelete() {
    if (busy.current || locked || !can("canDelete")) return;
    busy.current = true; setBusyKind("delete"); setError("");
    try {
      const result = await deleteContact(contact.id, contact.version);
      if (!alive.current) return;
      if (!result.ok) { setError(result.error.message); if (result.error.code !== "VALIDATION") setNeedsRefresh(true); return; }
      router.replace("/crm/contacts"); router.refresh();
    } catch { if (alive.current) { setError("Не удалось подтвердить удаление. Обновите карточку перед повтором"); setNeedsRefresh(true); } }
    finally { busy.current = false; if (alive.current) setBusyKind(null); }
  }
  function handleCloseDialog() { if (!busy.current) { setDialog(null); setError(""); } }

  if (recordError) return <ContactRecordError error={recordError} onRetry={handleRefresh} busy={busyKind !== null} />;
  return <div className="motion-fade min-w-0 space-y-6">
    <Link href="/crm/contacts" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" />Все контакты</Link>
    <header className="panel relative flex flex-wrap items-center gap-5 p-5 sm:p-6"><Avatar className="size-16 shrink-0 border border-primary/20" aria-hidden="true"><AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">{initials(contact.name)}</AvatarFallback></Avatar><div className="min-w-0 flex-1 basis-40"><p className="eyebrow mb-2 text-muted-foreground">CRM / Контакт</p><h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{contact.name}</h1><div className="mt-3 flex flex-wrap items-center gap-3"><ContactStageBadge stage={contact.stage} />{contact.company && <span className="max-w-full truncate text-xs text-muted-foreground">{contact.company}</span>}</div></div><div className="flex flex-wrap items-center gap-2">{mayWrite && <><label htmlFor="contact-detail-stage" className="sr-only">Этап контакта</label><select id="contact-detail-stage" value={contact.stage} disabled={locked} className="input h-9 w-auto min-w-32 text-xs" onChange={function handleStage(event) { const stage = CONTACT_STAGES.find((value) => value === event.target.value); if (stage) void handleUpdate({ stage }); }}>{CONTACT_STAGES.map((stage) => <option key={stage} value={stage}>{CONTACT_STAGE_LABELS[stage]}</option>)}</select><Button variant="outline" disabled={locked} onClick={function handleEdit() { setError(""); setEditingContact(contact); setDialog("edit"); }}><Pencil />Редактировать</Button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" disabled={locked} aria-label="Действия с контактом"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={function handleAssign() { setError(""); setDialog("assign"); }}><UserRoundCheck />Назначить ответственного</DropdownMenuItem>{can("canDelete") && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={function handleDeleteOpen() { setError(""); setDialog("delete"); }}><Trash2 />Удалить контакт</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></>}<Button variant="ghost" size="icon" disabled={busyKind !== null} aria-label="Обновить карточку контакта" onClick={handleRefresh}><RefreshCw className={busyKind === "refresh" ? "animate-spin" : ""} /></Button></div></header>
    <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
    {busyKind === "save" && <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status"><Spinner />Сохраняем изменения…</p>}
    {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">{error}{needsRefresh && <p className="mt-2 text-xs">Перед следующей записью обновите карточку кнопкой в заголовке.</p>}</div>}
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"><div className="min-w-0 space-y-6">{mayWrite && <ActivityComposer disabled={locked} busy={busyKind === "save"} onCreate={handleCreateActivity} />}<ActivityFeed page={detail.activities} type={activityType} now={now} disabled={locked} loading={busyKind === "feed"} onChange={handleFeedPage} /></div><aside className="min-w-0 space-y-6" aria-label="Информация о контакте"><ContactInfo contact={contact} now={now} /><ContactDeals page={detail.deals} disabled={locked} onPage={handleDealsPage} /><ContactTags tags={contact.tags} disabled={locked} editable={mayWrite} onSave={function handleTags(tags) { return handleUpdate({ tags }); }} /></aside></div>
    {dialog === "edit" && editingContact && mayWrite && <ContactFormSheet contact={editingContact} disabled={locked} onSave={function handleSaveForm(input) { return handleSave(() => updateContact(editingContact.id, editingContact.version, input), "Контакт обновлён"); }} onClose={handleCloseDialog} onReload={handleRefresh} />}
    {dialog === "assign" && <ContactReassignDialog count={1} disabled={needsRefresh} busy={busyKind === "save"} error={error} onConfirm={function handleAssignConfirm(ownerId) { void handleUpdate({ ownerId }).then((result) => { if (result.ok) setDialog(null); }); }} onClose={handleCloseDialog} />}
    {dialog === "delete" && <ConfirmDialog disabled={needsRefresh} title={`Удалить контакт «${contact.name}»?`} description="Удаление нельзя отменить. Контакт со связанными сделками, активностями или документами останется в системе." busy={busyKind === "delete"} error={error} onConfirm={handleDelete} onClose={handleCloseDialog} />}
  </div>;
}
