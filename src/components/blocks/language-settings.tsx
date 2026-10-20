"use client";
import { useState } from "react";
import { Languages } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { updateLanguage } from "@/i18n/actions";
import { Spinner } from "@/components/ui/feedback";

/** Persist English/Russian as a personal browser preference and reload every server/client message together. */
export function LanguageSettings() {
  const { locale, t } = useI18n(), [pending, setPending] = useState(false), [error, setError] = useState("");
  async function handleLanguage() {
    if (pending) return; setPending(true); setError("");
    try { const result = await updateLanguage(locale === "ru" ? "en" : "ru"); if (!result.ok) { setError(result.error.message); setPending(false); return; } window.location.reload(); }
    catch { setError(t("The language could not be changed. Please try again.")); setPending(false); }
  }
  return <section className="motion-fade panel p-6" aria-labelledby="language-settings-title"><h2 id="language-settings-title" className="flex items-center gap-2 text-sm font-medium"><Languages className="size-4 text-primary" />{t("Language")}</h2><p className="mb-5 mt-2 text-xs text-muted-foreground">{t("English is the default. This preference is saved for this browser and applies to the entire interface, documents, and exports.")}</p><div className="flex flex-wrap items-center gap-4"><span className={locale === "en" ? "text-sm font-medium" : "text-sm text-muted-foreground"} lang="en">English</span><button type="button" role="switch" aria-checked={locale === "ru"} aria-label={t("Use Russian")} disabled={pending} onClick={handleLanguage} className={`motion relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 ${locale === "ru" ? "border-primary bg-primary" : "bg-muted"}`}><span aria-hidden="true" className={`block size-5 rounded-full bg-background shadow-sm transition-transform motion-reduce:transition-none ${locale === "ru" ? "translate-x-6" : "translate-x-1"}`} /></button><span className={locale === "ru" ? "text-sm font-medium" : "text-sm text-muted-foreground"} lang="ru">Русский</span>{pending && <span role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Spinner />{t("Applying language…")}</span>}</div>{error && <p role="alert" className="mt-4 text-xs text-destructive">{t(error)}</p>}</section>;
}
