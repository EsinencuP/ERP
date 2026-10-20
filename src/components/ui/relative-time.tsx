"use client";
import { useAppFormat } from "@/modules/settings/configuration-provider";

import { useI18n } from "@/i18n/use-i18n";
import { formatDistanceStrict } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

/** Render deterministic relative time with an exact, timezone-stable accessible timestamp. */
export function RelativeTime({ value, now, className }: { value: string; now: string; className?: string }) {
  const { locale: uiLocale, localeTag: uiLocaleTag } = useI18n();
  const { formatDateTime } = useAppFormat();

  return <time dateTime={value} title={formatDateTime(new Date(value))} className={cn("motion-fade", className)}>{formatDistanceStrict(new Date(value), new Date(now), { locale: uiLocale === "ru" ? ru : enUS, addSuffix: true })}</time>;
}
