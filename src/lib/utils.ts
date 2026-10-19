import { clsx, type ClassValue } from "clsx";
import { format as formatDateValue, isValid, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

const graphemeSegmenter = new Intl.Segmenter("ru", { granularity: "grapheme" });

/** Merge conditional Tailwind classes for shared UI primitives. */
export function cn(...inputs: ClassValue[]): string { return twMerge(clsx(inputs)); }

/** Format integer minor units exactly (including Decimal strings); invalid input returns an em dash. */
export function formatCurrency(amount: number | bigint | string, currency = "RUB"): string {
  if (typeof amount === "number" && !Number.isSafeInteger(amount)) return "—";
  if (typeof amount === "string" && !/^-?\d+$/.test(amount)) return "—";
  if (!/^[a-z]{3}$/i.test(currency)) return "—";
  try {
    const value = BigInt(amount);
    const code = currency.toUpperCase();
    const digits = new Intl.NumberFormat("ru-RU", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits ?? 2;
    const scale = 10n ** BigInt(digits);
    const absolute = value < 0n ? -value : value;
    const whole = absolute / scale;
    const fraction = absolute % scale;
    const signedWhole = value < 0n ? whole === 0n ? -0 : -whole : whole;
    const formatter = new Intl.NumberFormat("ru-RU", { style: "currency", currency: code, minimumFractionDigits: fraction === 0n ? 0 : digits, maximumFractionDigits: digits });
    return formatter.formatToParts(signedWhole).map((part) => part.type === "fraction" ? fraction.toString().padStart(digits, "0") : part.value).join("");
  } catch { return "—"; }
}

/** Format an ISO date or Date with date-fns tokens and Russian locale in the runtime timezone. */
export function formatDate(date: string | Date | number, format = "dd.MM.yyyy"): string {
  if (date === "") return "—";
  try {
    const value = typeof date === "string" ? parseISO(date) : new Date(date);
    return isValid(value) ? formatDateValue(value, format, { locale: ru }) : "—";
  } catch { return "—"; }
}

/** Generate an opaque UUID, or format a server-allocated yearly sequence without allocating it here. */
export function generateId(prefix = "", sequence?: { year: number; value: number }): string {
  if (sequence) return `${prefix}-${String(sequence.year).padStart(4, "0")}-${String(sequence.value).padStart(4, "0")}`;
  const id = globalThis.crypto.randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}

/** Limit visible graphemes, counting the suffix within maxLength and preserving joined emoji. */
export function truncate(value: string, maxLength = 80, suffix = "…"): string {
  if (!Number.isFinite(maxLength) || maxLength < 1) return "";
  const limit = Math.floor(maxLength);
  const characters = Array.from(graphemeSegmenter.segment(value), (part) => part.segment);
  if (characters.length <= limit) return value;
  const ending = Array.from(graphemeSegmenter.segment(suffix), (part) => part.segment).slice(0, limit);
  return characters.slice(0, limit - ending.length).join("") + ending.join("");
}

/** Format integer minor currency units as Russian rubles. */
export function money(amount: number, compact = false): string {
  if (!compact) return formatCurrency(amount);
  if (!Number.isSafeInteger(amount)) return "—";
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 0, maximumFractionDigits: 1, notation: "compact" }).format(amount / 100);
}

/** Format a persisted ISO date without depending on the machine timezone. */
export function dateLabel(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "Europe/Moscow" }).format(date);
}

/** Produce a short avatar label from a person's or company's name. */
export function initials(value: string): string { return value.split(" ").filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase(); }
