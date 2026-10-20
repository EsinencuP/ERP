"use client";
import { useI18n } from "@/i18n/use-i18n";


import { useState, type FormEvent } from "react";
import { Plus, Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Result } from "@/types/shared";
import { contactTagsSchema } from "../schema";

/** Add and remove persisted contact tags through the versioned contact update boundary. */
export function ContactTags({ tags, disabled, editable, onSave }: { tags: string[]; disabled: boolean; editable: boolean; onSave: (tags: string[]) => Promise<Result<true>> }) {
  const { t } = useI18n();

  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (disabled) return;
    const parsed = contactTagsSchema.safeParse([...tags, draft]);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? t("Проверьте тег")); return; }
    setError(""); const result = await onSave(parsed.data); if (result.ok) setDraft("");
  }
  async function handleRemove(tag: string) { if (disabled) return; setError(""); await onSave(tags.filter((item) => item !== tag)); }
  return <section className="motion-fade panel relative min-w-0 p-5" aria-labelledby="contact-tags-title"><h2 id="contact-tags-title" className="flex items-center gap-2 text-sm font-semibold"><Tag className="size-4 text-muted-foreground" />{t("Теги")}<span className="ml-auto font-mono text-xs text-muted-foreground">{tags.length}</span></h2><div className="mt-4 flex flex-wrap gap-2">{tags.map((tag) => <Badge key={tag.toLocaleLowerCase("ru")} variant="secondary" className="max-w-full gap-2 py-1.5"><span className="truncate" title={tag}>{tag}</span>{editable && <button type="button" disabled={disabled} onClick={function handleTagRemove() { void handleRemove(tag); }} aria-label={t`Удалить тег ${tag}`} className="rounded p-0.5 hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"><X className="size-3" /></button>}</Badge>)}{!tags.length && <p className="text-xs text-muted-foreground">{t("Тегов пока нет.")}</p>}</div>{editable && <form onSubmit={handleAdd} className="relative mt-4"><label htmlFor="contact-tag-input" className="sr-only">{t("Новый тег")}</label><div className="flex gap-2"><Input id="contact-tag-input" maxLength={32} placeholder={t("Новый тег")} value={draft} disabled={disabled || tags.length >= 20} onChange={function handleDraft(event) { setDraft(event.target.value); setError(""); }} className="min-w-0 flex-1" /><Button type="submit" variant="outline" size="icon" aria-label={t("Добавить тег")} disabled={disabled || !draft.trim() || tags.length >= 20}><Plus /></Button></div><p className="mt-2 text-[10px] text-muted-foreground">{t("До 20 тегов, по 32 символа.")}</p>{error && <p role="alert" className="mt-2 text-xs text-destructive">{t(error)}</p>}</form>}</section>;
}
