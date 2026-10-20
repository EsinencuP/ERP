import type { Locale } from "./config";
const forms = { product: { en: ["product", "products", "products"], ru: ["товар", "товара", "товаров"] }, workingDay: { en: ["working day", "working days", "working days"], ru: ["рабочий день", "рабочих дня", "рабочих дней"] }, invoice: { en: ["invoice", "invoices", "invoices"], ru: ["счёт", "счёта", "счетов"] } } as const;
/** Inflect application count labels with Russian one/few/many forms and English singular/plural. */
export function countLabel(locale: Locale, value: number, noun: keyof typeof forms, includeNumber = true): string {
  const category = new Intl.PluralRules(locale).select(value), word = forms[noun][locale][category === "one" ? 0 : category === "few" ? 1 : 2];
  return includeNumber ? new Intl.NumberFormat(locale).format(value) + " " + word : word;
}
