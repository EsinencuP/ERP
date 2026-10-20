
import { useI18n } from "@/i18n/use-i18n";
import { Skeleton } from "@/components/ui/skeleton";
/** Show a stable finance loading state while server queries resolve. */
export default function Loading() {
  const { t } = useI18n();
 return <div className="motion-fade space-y-5" role="status" aria-label={t("Загрузка финансов")}><Skeleton className="h-10 w-52" /><Skeleton className="h-24 w-full" /><Skeleton className="h-80 w-full" /></div>; }
