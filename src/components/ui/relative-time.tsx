import { formatDistanceStrict } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

/** Render deterministic relative time with an exact, timezone-stable accessible timestamp. */
export function RelativeTime({ value, now, className }: { value: string; now: string; className?: string }) {
  return <time dateTime={value} title={new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Moscow" }).format(new Date(value))} className={cn("motion-fade", className)}>{formatDistanceStrict(new Date(value), new Date(now), { locale: ru, addSuffix: true })}</time>;
}
