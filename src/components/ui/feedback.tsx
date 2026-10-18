import { AlertCircle, ArrowRight, Inbox, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { AppError } from "@/types/shared";

/** Render an actionable application error without exposing database internals. */
export function ErrorPanel({ error }: { error: AppError }) { return <div className="panel mx-auto max-w-lg p-8" role="alert"><AlertCircle className="mb-4 size-6 text-[hsl(var(--color-warning))]" /><h1 className="text-lg font-medium">{error.code === "UNAUTHORIZED" ? "Войдите в рабочее пространство" : "Не удалось выполнить действие"}</h1><p className="muted my-3 text-sm">{error.message}</p><Button asChild variant="outline"><Link href={error.code === "UNAUTHORIZED" ? "/login" : "/"}>{error.code === "UNAUTHORIZED" ? "Перейти ко входу" : "К обзору"}<ArrowRight /></Link></Button></div>; }

/** Announce empty list and search states. */
export function EmptyState({ title = "Пока ничего нет", description = "Добавьте первую запись, чтобы начать работу." }: { title?: string; description?: string }) { return <div className="motion flex min-h-48 flex-col items-center justify-center p-8 text-center"><span className="mb-3 rounded-xl border bg-[hsl(var(--color-surface-raised))] p-3"><Inbox className="size-5 muted" /></span><h3 className="font-medium">{title}</h3><p className="muted mt-2 max-w-xs text-xs">{description}</p></div>; }

/** Render an accessible busy indicator in forms and buttons. */
export function Spinner() { return <Loader2 aria-label="Загрузка" className="size-4 animate-spin" />; }
