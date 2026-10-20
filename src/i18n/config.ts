export const LOCALES = ["en", "ru"] as const;
export type Locale = typeof LOCALES[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "evo_locale";

/** Accept only supported interface languages; all other values use the English default. */
export function resolveLocale(value: unknown): Locale { return value === "ru" ? "ru" : DEFAULT_LOCALE; }

/** Select presentation conventions without changing currencies or business time zones. */
export function intlLocale(locale: Locale): "en-US" | "ru-RU" { return locale === "ru" ? "ru-RU" : "en-US"; }
