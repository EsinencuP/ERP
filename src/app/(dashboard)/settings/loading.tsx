import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n/use-i18n";
/** Announce loading for settings and its member/audit subroutes. */
export default function Loading() { const { t } = useI18n(); return <div role="status" aria-label={t("Загрузка рабочего пространства")} className="motion space-y-6"><Skeleton className="h-12 w-64" /><Skeleton className="h-32" /><Skeleton className="h-72" /></div>; }
