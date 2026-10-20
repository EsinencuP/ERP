
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
export function EmptyState({ title = "Пока ничего нет", description = "Добавьте первую запись, чтобы начать работу.", action }: { title?: string; description?: string; action?: React.ReactNode }) {
  const { t } = useI18n();
 return <div className="motion-fade flex min-h-60 flex-col items-center justify-center px-5 py-10 text-center"><div aria-hidden="true" className="relative mb-6 flex size-20 items-center justify-center"><span className="absolute inset-0 rounded-full border border-dashed bg-muted/40" /><span className="absolute inset-2 rounded-full border bg-surface" /><span className="relative rounded-xl border bg-muted p-3 shadow-sm"><Inbox className="size-6 text-primary" /></span></div><h3 className="text-sm font-semibold">{t(title)}</h3><p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">{t(description)}</p>{action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}</div>; }

/** Render an accessible busy indicator in forms and buttons. */
export function Spinner() {
  const { t } = useI18n();
 return <Loader2 aria-label={t("Загрузка")} className="size-4 animate-spin" />; }
