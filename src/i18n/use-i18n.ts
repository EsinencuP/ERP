import { countLabel } from "./count";
import { useLocale } from "next-intl";
import { createTranslator } from "./translate";
import { intlLocale, resolveLocale } from "./config";

/** Read the same request locale in synchronous Server Components and hydrated Client Components. */
export function useI18n() { const locale = resolveLocale(useLocale()); return { locale, localeTag: intlLocale(locale), t: createTranslator(locale), count: (value: number, noun: Parameters<typeof countLabel>[2], includeNumber = true) => countLabel(locale, value, noun, includeNumber) }; }
