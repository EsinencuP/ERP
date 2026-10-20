"use client";
import { useI18n } from "@/i18n/use-i18n";

import { Button } from "@/components/ui/button";

/** Recover from unexpected rendering errors at the framework boundary. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
 return <div className="panel p-8" role="alert"><h2 className="text-lg font-medium">{t("Не удалось открыть страницу")}</h2><p className="muted my-3 text-sm">{t("Попробуйте загрузить её снова.")}</p><Button onClick={function handleRetry() { reset(); }}>{t("Повторить")}</Button></div>; }
