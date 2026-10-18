"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/feedback";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getContactAssignees } from "../actions";
import type { ContactAssignee } from "../types";
import { ContactAssigneeAvatar } from "./contact-presentation";

/** Search current workspace members and require an explicit assignment choice. */
export function ContactReassignDialog({ count, busy, error, onConfirm, onClose, disabled = false }: { count: number; busy: boolean; error: string; onConfirm: (ownerId: string | null) => void; onClose: () => void; disabled?: boolean }) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [members, setMembers] = useState<ContactAssignee[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError("");
    getContactAssignees(debounced).then((result) => {
      if (!active) return;
      if (result.ok) setMembers(result.data);
      else { setMembers([]); setLoadError(result.error.message); }
    }).catch(() => { if (active) { setMembers([]); setLoadError("Не удалось загрузить участников. Повторите запрос"); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [debounced, retry]);
  return <Dialog open onOpenChange={function handleOpenChange(open) { if (!open && !busy) onClose(); }}><DialogContent className="motion-fade" onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }} onPointerDownOutside={(event) => { if (busy) event.preventDefault(); }}>
    <DialogTitle className="pr-8 text-lg font-semibold">Назначить ответственного</DialogTitle>
    <DialogDescription className="mt-2 text-sm text-muted-foreground">Контактов: {count}. Изменения сохранятся для всей выборки.</DialogDescription>
    <label className="mt-6 block text-xs font-medium" htmlFor="assignee-search">Найти участника</label>
    <Input id="assignee-search" value={search} maxLength={200} disabled={busy} onChange={function handleSearch(event) { setSearch(event.target.value); }} placeholder="Имя или email" className="mb-4 mt-2" />
    <fieldset disabled={busy || disabled} className="space-y-2"><legend className="sr-only">Новый ответственный</legend>
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"><input type="radio" name="contact-assignee" checked={ownerId === null} onChange={function handleUnassign() { setOwnerId(null); }} className="accent-[hsl(var(--color-primary))]" /><span className="text-xs">Снять назначение</span></label>
      <div className="max-h-56 space-y-2 overflow-y-auto" aria-busy={loading}>
        {loading ? <div role="status" className="flex items-center gap-2 p-3 text-xs text-muted-foreground"><Spinner />Загрузка участников…</div> : members.map((member) => <label key={member.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-accent"><input type="radio" name="contact-assignee" checked={ownerId === member.id} onChange={function handleAssign() { setOwnerId(member.id); }} className="accent-[hsl(var(--color-primary))]" /><ContactAssigneeAvatar owner={member} /></label>)}
        {!loading && !members.length && !loadError && <p className="p-3 text-xs text-muted-foreground">Участники не найдены. Измените поиск.</p>}
      </div>
    </fieldset>
    <p className="mt-3 text-[11px] text-muted-foreground">Показано до 50 активных участников. Используйте поиск, чтобы уточнить список.</p>
    {loadError && <div role="alert" className="mt-3 text-xs text-destructive">{loadError}<Button variant="link" size="sm" onClick={function handleRetry() { setRetry((value) => value + 1); }}>Повторить</Button></div>}
    {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
    <div className="mt-6 flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={onClose}>Отмена</Button><Button disabled={busy || disabled || ownerId === undefined} onClick={function handleConfirm() { if (ownerId !== undefined) onConfirm(ownerId); }}>{busy && <Spinner />}Сохранить</Button></div>
  </DialogContent></Dialog>;
}
