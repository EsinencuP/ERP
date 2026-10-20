import { DEFAULT_LOCALE, intlLocale, type Locale } from "@/i18n/config";
import { err, ok } from "@/lib/errors";
import type { Result } from "@/types/shared";

const dayMs = 86400000;
/** Compute an exact one-decimal percentage label while converting only a bounded bar fill to Number. */
export function getProjectRatio(value: string, total: string, locale: Locale = DEFAULT_LOCALE): { label: string; fill: number } | null {
  if (!/^\d+$/.test(value) || !/^\d+$/.test(total) || BigInt(total) === 0n) return null;
  const denominator = BigInt(total), tenths = (BigInt(value) * 1000n + denominator / 2n) / denominator;
  return { label: `${new Intl.NumberFormat(intlLocale(locale)).format(tenths / 10n)}${tenths % 10n ? `${locale === "ru" ? "," : "."}${tenths % 10n}` : ""}%`, fill: Number(tenths > 1000n ? 1000n : tenths) / 10 };
}
/** Return the configured calendar date without relying on locale-specific date ordering. */
export function getProjectToday(now: string, timezone = "Europe/Moscow"): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(now));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
/** Validate a calendar-day timeline window and keep CSS Grid bounded to at most 93 tracks. */
export function getProjectTimelineDays(from: string, to: string): Result<string[]> {
  const valid = (value: string) => { const date = new Date(`${value}T00:00:00Z`); return /^(19|[2-9]\d)\d{2}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value; };
  if (!valid(from) || !valid(to)) return err("VALIDATION", "Укажите корректные даты периода");
  const start = Date.parse(`${from}T00:00:00Z`), length = (Date.parse(`${to}T00:00:00Z`) - start) / dayMs + 1;
  if (length < 1 || length > 93) return err("VALIDATION", "Период timeline: от 1 до 93 календарных дней");
  return ok(Array.from({ length }, (_, index) => new Date(start + index * dayMs).toISOString().slice(0, 10)));
}
/** Show the previous week and the next five weeks relative to the current configured calendar. */
export function getDefaultProjectTimeline(now: string, timezone = "Europe/Moscow"): { from: string; to: string } {
  const today = new Date(`${getProjectToday(now, timezone)}T00:00:00Z`), monday = (today.getUTCDay() + 6) % 7;
  const from = new Date(today.getTime() - (monday + 7) * dayMs), to = new Date(from.getTime() + 41 * dayMs);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}
/** Clip an explicitly dated project to the visible window, preserving inclusive single-day bars. */
export function getProjectTimelineBar(start: string | null, end: string | null, days: readonly string[]): { column: number; span: number; clippedStart: boolean; clippedEnd: boolean } | null {
  const first = days[0], last = days[days.length - 1];
  if (!start || !end || !first || !last || end < start || start > last || end < first) return null;
  const visibleStart = start < first ? first : start, visibleEnd = end > last ? last : end;
  return { column: Math.round((Date.parse(visibleStart) - Date.parse(first)) / dayMs) + 2, span: Math.round((Date.parse(visibleEnd) - Date.parse(visibleStart)) / dayMs) + 1, clippedStart: start < first, clippedEnd: end > last };
}
