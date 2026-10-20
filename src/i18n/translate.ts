import english from "./en.json";
import russian from "./ru.json";
import type { Locale } from "./config";

export type Translator = (message: string | TemplateStringsArray | null | undefined, ...values: unknown[]) => string;
const catalogs: Record<Locale, Readonly<Record<string, string>>> = { en: english, ru: russian };
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const templates = Object.keys(english).filter((key) => /\{\d+\}/.test(key)).sort((a, b) => b.replace(/\{\d+\}/g, "").length - a.replace(/\{\d+\}/g, "").length).map((key) => ({ key, indices: [...key.matchAll(/\{(\d+)\}/g)].map((match) => Number(match[1])), pattern: new RegExp(`^${key.split(/\{\d+\}/g).map(escape).join("([\\s\\S]*?)")}$`) }));
const format = (message: string, values: readonly unknown[]) => message.replace(/\{(\d+)\}/g, (_, index: string) => String(values[Number(index)] ?? ""));

/** Translate application-owned text only, preserving interpolated user content and stable storage values. */
export function translate(locale: Locale, source: string, values?: readonly unknown[]): string {
  const catalog = catalogs[locale];
  if (Object.hasOwn(catalog, source)) return format(catalog[source] ?? source, values ?? []);
  const core = source.trim();
  if (core !== source && Object.hasOwn(catalog, core)) return source.slice(0, source.indexOf(core)) + format(catalog[core] ?? core, values ?? []) + source.slice(source.indexOf(core) + core.length);
  if (values) return format(source, values);
  // Existing domain errors remain locale-neutral until their presentation/HTTP boundary.
  for (const template of templates) { const match = template.pattern.exec(source); if (!match) continue; const captures: string[] = []; template.indices.forEach((index, position) => { captures[index] = match[position + 1] ?? ""; }); return format(catalog[template.key] ?? template.key, captures); }
  return source;
}

/** Bind a request/component locale; tagged templates keep variable values separate from translatable copy. */
export function createTranslator(locale: Locale): Translator {
  return (source, ...values) => source == null ? "" : typeof source === "string" ? translate(locale, source) : translate(locale, source.map((part, index) => part + (index < values.length ? `{${index}}` : "")).join(""), values);
}
