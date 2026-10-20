"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/use-i18n";

/** Recover a failed route without displaying raw exceptions or substituting empty data. */
export function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n(), router = useRouter(), [pending, startTransition] = useTransition();
  function handleRetry() { startTransition(() => { router.refresh(); reset(); }); }
  return <section className="panel mx-auto max-w-lg p-6 sm:p-8" role="alert">
    <span className="mb-5 inline-flex rounded-xl border bg-muted p-3"><AlertCircle className="size-6 text-warning" /></span>
    <h1 className="text-xl font-semibold">{t("This page could not be loaded")}</h1>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("Please try again. If the problem continues, contact your workspace administrator.")}</p>
    {error.digest && <p className="mt-4 break-all font-mono text-xs text-muted-foreground">{t("Error reference")}: {error.digest}</p>}
    <div className="mt-6 flex flex-wrap gap-3"><Button disabled={pending} onClick={handleRetry}><RefreshCw className={pending ? "animate-spin" : ""} />{t(pending ? "Retrying…" : "Try again")}</Button><Button asChild variant="outline"><a href="/">{t("Back to overview")}<ArrowRight /></a></Button></div>
  </section>;
}
