
import { useI18n } from "@/i18n/use-i18n";
import { AlertCircle, ArrowRight, Inbox, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { AppError } from "@/types/shared";

/** Render an actionable application error without exposing database internals. */
export function ErrorPanel({ error }: { error: AppError }) {
  const { t } = useI18n();
 return <div className="panel mx-auto max-w-lg p-8" role="alert"><AlertCircle className="mb-4 size-6 text-[hsl(var(--color-warning))]" /><h1 className="text-lg font-medium">{error.code === "UNAUTHORIZED" ? t("Войдите в рабочее пространство") : t("Не удалось выполнить действие")}</h1><p className="muted my-3 text-sm">{t(error.message)}</p><Button asChild variant="outline"><Link href={error.code === "UNAUTHORIZED" ? "/login" : "/"}>{error.code === "UNAUTHORIZED" ? t("Перейти ко входу") : t("К обзору")}<ArrowRight /></Link></Button></div>; }

/** Announce empty list and search states. */
export function EmptyState({ title = "Пока ничего нет", description = "Добавьте первую запись, чтобы начать работу." }: { title?: string; description?: string }) {
  const { t } = useI18n();
 return <div className="motion flex min-h-48 flex-col items-center justify-center p-8 text-center"><span className="mb-3 rounded-xl border bg-[hsl(var(--color-surface-raised))] p-3"><Inbox className="size-5 muted" /></span><h3 className="font-medium">{t(title)}</h3><p className="muted mt-2 max-w-xs text-xs">{t(description)}</p></div>; }

/** Render an accessible busy indicator in forms and buttons. */
export function Spinner() {
  const { t } = useI18n();
 return <Loader2 aria-label={t("Загрузка")} className="size-4 animate-spin" />; }
