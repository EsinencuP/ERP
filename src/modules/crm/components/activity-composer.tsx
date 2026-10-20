"use client";
import { useI18n } from "@/i18n/use-i18n";


import type { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/feedback";
import type { Result } from "@/types/shared";
import { ACTIVITY_TYPES, activityComposerSchema } from "../schema";
import { ACTIVITY_PRESENTATION } from "./activity-presentation";

export type ActivityComposerValues = z.input<typeof activityComposerSchema>;

/** Add one of five activity types using the same field validation as the server DTO. */
export function ActivityComposer({ disabled, busy, onCreate }: { disabled: boolean; busy: boolean; onCreate: (input: ActivityComposerValues) => Promise<Result<true>> }) {
  const { t } = useI18n();

  const form = useForm<ActivityComposerValues>({ resolver: zodResolver(activityComposerSchema), defaultValues: { type: "NOTE", subject: "", description: "" } });
  async function handleSubmit(input: ActivityComposerValues) {
    const result = await onCreate(input);
    if (result.ok) form.reset({ type: input.type, subject: "", description: "" });
  }
  return <form onSubmit={form.handleSubmit(handleSubmit)} className="motion-fade panel relative p-5" noValidate>
    <h2 className="text-sm font-semibold">{t("Добавить активность")}</h2><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("Зафиксируйте контакт с клиентом или следующий шаг.")}</p>
    <fieldset disabled={disabled || form.formState.isSubmitting} className="mt-5 space-y-4"><legend className="sr-only">{t("Новая активность контакта")}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("Тип активности")}>{ACTIVITY_TYPES.map((type) => { const item = ACTIVITY_PRESENTATION[type]; const Icon = item.icon; return <label key={type} className="relative cursor-pointer"><input type="radio" value={type} className="peer sr-only" {...form.register("type")} /><span className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-muted-foreground transition-colors peer-checked:border-primary/40 peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-ring"><Icon className="size-3.5" />{t(item.label)}</span></label>; })}</div>
      <div><label htmlFor="activity-subject" className="mb-2 block text-xs font-medium">{t("Тема ")}<span aria-hidden="true">*</span></label><Input id="activity-subject" maxLength={240} placeholder={t("Например, обсудили предложение")} {...form.register("subject")} aria-invalid={Boolean(form.formState.errors.subject)} aria-describedby="activity-subject-error" /><p id="activity-subject-error" role={form.formState.errors.subject ? "alert" : undefined} className="mt-1.5 text-xs text-destructive">{t(form.formState.errors.subject?.message)}</p></div>
      <div><label htmlFor="activity-description" className="mb-2 block text-xs font-medium">{t("Подробности")}</label><Textarea id="activity-description" rows={3} maxLength={10000} placeholder={t("Результат разговора, заметки или план действий…")} {...form.register("description")} aria-invalid={Boolean(form.formState.errors.description)} aria-describedby="activity-description-error" /><p id="activity-description-error" className="mt-1.5 text-xs text-destructive">{t(form.formState.errors.description?.message)}</p></div>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[11px] text-muted-foreground">{t("Запись появится в истории контакта.")}</p><Button type="submit" disabled={disabled || form.formState.isSubmitting}>{busy ? <Spinner /> : <Plus />}{t("Добавить активность")}</Button></div>
    </fieldset>
  </form>;
}
