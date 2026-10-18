"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppError } from "@/types/shared";

/** Present missing, unauthorized and unavailable records through the shared Result contract. */
export function ContactRecordError({ error, onRetry, busy = false }: { error: AppError; onRetry?: () => void; busy?: boolean }) {
  const router = useRouter();
  return <div className="motion-fade panel mx-auto max-w-xl p-8" role="alert"><AlertCircle className="mb-4 size-6 text-warning" /><h1 className="text-xl font-semibold">{error.code === "NOT_FOUND" ? "Контакт не найден" : error.code === "CONFIGURATION" ? "Карточка доступна в подключённом рабочем пространстве" : "Не удалось открыть контакт"}</h1><p className="my-4 text-sm leading-relaxed text-muted-foreground">{error.code === "CONFIGURATION" ? "Для работы с контактами войдите в рабочее пространство с подключённой базой данных." : error.message}</p><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href={error.code === "UNAUTHORIZED" ? "/login" : "/crm/contacts"}><ArrowLeft />{error.code === "UNAUTHORIZED" ? "Ко входу" : "Все контакты"}</Link></Button><Button variant="ghost" disabled={busy} onClick={function handleRetry() { if (onRetry) onRetry(); else router.refresh(); }}><RefreshCw />Повторить</Button></div></div>;
}
