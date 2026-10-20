import Link from "next/link";
import { getI18n } from "@/i18n/server";
/** Present unavailable URLs in the active browser language. */
export default async function NotFound() {
  const { t } = await getI18n();
  return <main id="main-content" className="motion-fade mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-5 px-6"><p className="font-mono text-sm text-muted-foreground">404</p><h1 className="text-3xl font-semibold">{t("Page not found")}</h1><p className="text-muted-foreground">{t("The page may have moved, or the address is incorrect.")}</p><Link href="/" className="w-fit rounded-lg border px-4 py-3 text-sm text-primary">{t("Back to dashboard")}</Link></main>;
}
