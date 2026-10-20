import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n/use-i18n";

type LoadingVariant = "table" | "detail" | "dashboard" | "form" | "board";

/** Reserve the route's main layout while Next.js streams its server data through Suspense. */
export function RouteLoading({ variant = "table" }: { variant?: LoadingVariant }) {
  const { t } = useI18n();
  return <div className="motion-fade min-w-0 space-y-6" role="status" aria-live="polite" aria-busy="true">
    <span className="sr-only">{t("Loading page…")}</span>
    <div aria-hidden="true" className="space-y-6">
      <div className="space-y-3"><Skeleton className="h-3 w-24" /><Skeleton className="h-9 w-48 max-w-full" /><Skeleton className="h-3 w-80 max-w-full" /></div>
      {variant === "dashboard" ? <><div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[1, 2, 3, 4].map(key => <Skeleton key={key} className="h-28 rounded-2xl" />)}</div><div className="grid gap-6 xl:grid-cols-2"><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div></> : variant === "board" ? <div className="flex gap-4 overflow-hidden">{[1, 2, 3, 4].map(key => <Skeleton key={key} className="h-96 min-w-64 flex-1 rounded-2xl" />)}</div> : variant === "detail" ? <div className="grid gap-6 lg:grid-cols-[2fr_1fr]"><Skeleton className="h-80 rounded-2xl" /><Skeleton className="h-60 rounded-2xl" /></div> : variant === "form" ? <div className="mx-auto max-w-lg space-y-5 rounded-2xl border p-6">{[1, 2, 3].map(key => <Skeleton key={key} className="h-12" />)}<Skeleton className="h-10 w-32" /></div> : <><div className="flex gap-3"><Skeleton className="h-10 w-72 max-w-full" /><Skeleton className="h-10 w-24" /></div><div className="space-y-4 rounded-2xl border p-5"><Skeleton className="h-8" />{[1, 2, 3, 4, 5].map(key => <Skeleton key={key} className="h-12" />)}</div></>}
    </div>
  </div>;
}

/** Render a list-route loading boundary. */
export function TableLoading() { return <RouteLoading />; }
/** Render a record-detail loading boundary. */
export function DetailLoading() { return <RouteLoading variant="detail" />; }
/** Render a dashboard loading boundary. */
export function DashboardLoading() { return <RouteLoading variant="dashboard" />; }
/** Render an authentication/configuration loading boundary. */
export function FormLoading() { return <RouteLoading variant="form" />; }
/** Render a Kanban loading boundary without overflowing narrow viewports. */
export function BoardLoading() { return <RouteLoading variant="board" />; }
