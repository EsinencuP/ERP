import "server-only";
import { getLocale } from "next-intl/server";
import { createTranslator, translate } from "./translate";
import { resolveLocale } from "./config";
import type { AppError, Result } from "@/types/shared";

/** Resolve a translator from the current request, never from shared mutable server state. */
export async function getI18n() { const locale = resolveLocale(await getLocale()); return { locale, t: createTranslator(locale) }; }

/** Localize only application errors at a server boundary; successful business records are never translated. */
export function localizeResult(result: { ok: false; error: AppError }): Promise<{ ok: false; error: AppError }>;
export function localizeResult<T>(result: { ok: true; data: T }): Promise<{ ok: true; data: T }>;
export function localizeResult<T>(result: Result<T>): Promise<Result<T>>;
export async function localizeResult<T>(result: Result<T>): Promise<Result<T>> {
  if (result.ok) return result;
  const { locale } = await getI18n(), fields = result.error.meta?.fields;
  const localizeFields = (value: unknown): unknown => Array.isArray(value) ? value.map(localizeFields) : typeof value === "string" ? translate(locale, value) : typeof value === "object" && value !== null ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localizeFields(item)])) : value;
  return { ok: false, error: { ...result.error, message: translate(locale, result.error.message), ...(fields === undefined ? {} : { meta: { ...result.error.meta, fields: localizeFields(fields) } }) } };
}
