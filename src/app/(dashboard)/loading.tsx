
import { useI18n } from "@/i18n/use-i18n";
/** Show an accessible loading shell while workspace data is fetched. */
export default function Loading() {
  const { t } = useI18n();
 return <div className="motion space-y-6" role="status" aria-label={t("Загрузка рабочего пространства")}><div className="h-10 w-56 animate-pulse rounded-lg bg-[hsl(var(--color-surface-raised))]" /><div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[1, 2, 3, 4].map((key) => <div key={key} className="panel h-32 animate-pulse" />)}</div><div className="panel h-80 animate-pulse" /></div>; }
