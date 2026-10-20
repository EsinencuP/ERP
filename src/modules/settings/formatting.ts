import type { Locale } from "@/i18n/config";
import { intlLocale } from "@/i18n/config";
import type { AppConfiguration } from "./config-schema";
type Preferences = Pick<AppConfiguration, "dateFormat" | "timezone">;
const DEFAULTS: Preferences = { timezone: "Europe/Moscow", dateFormat: "yyyy-MM-dd" };
/** Format DATE values without a timezone shift and timestamps in the workspace zone. */
export function configuredDate(value: string | Date | number, locale: Locale, preferences: Preferences = DEFAULTS): string {
 if (value === "") return "—";
 const calendar = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
 const date = new Date(calendar ? value + "T00:00:00Z" : value);
 if (Number.isNaN(date.getTime()) || (calendar && date.toISOString().slice(0,10)!==value)) return "—";
 const zone = calendar ? "UTC" : preferences.timezone;
 const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
 const get = (key: string) => parts.find(p => p.type === key)?.value ?? "";
 const year=get("year"), month=get("month"), day=get("day");
 if (preferences.dateFormat === "dd.MM.yyyy") return `${day}.${month}.${year}`;
 if (preferences.dateFormat === "MM/dd/yyyy") return `${month}/${day}/${year}`;
 if (preferences.dateFormat === "MMM d, yyyy") return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: zone, month: "short" }).format(date) + ` ${Number(day)}, ${year}`;
 return `${year}-${month}-${day}`;
}
/** Format an instant using a deterministic 24-hour clock in the workspace zone. */
export function configuredTimestamp(value: string | Date | number, locale: Locale, preferences: Preferences = DEFAULTS): string {
 const date=new Date(value); if (Number.isNaN(date.getTime())) return "—";
 return configuredDate(date,locale,preferences)+" "+new Intl.DateTimeFormat(intlLocale(locale), { timeZone: preferences.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}
/** Resolve today's ISO calendar date in the configured zone for date inputs and report boundaries. */
export function workspaceToday(timezone: string, now = new Date()): string { return configuredDate(now,"en",{timezone,dateFormat:"yyyy-MM-dd"}); }
