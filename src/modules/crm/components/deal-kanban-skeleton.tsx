import { Skeleton } from "@/components/ui/skeleton";

/** Render the six-column shape while the server loads the initial pipeline snapshot. */
export function DealKanbanSkeleton() {
  return <div className="motion-fade" role="status" aria-label="Загрузка воронки"><span className="sr-only">Загрузка воронки сделок…</span><Skeleton className="mb-6 h-8 w-60" /><div className="flex gap-4 overflow-hidden" aria-hidden="true">{[1, 2, 3, 4, 5, 6].map((column) => <div key={column} className="w-72 shrink-0 rounded-xl border p-4"><Skeleton className="mb-6 h-4 w-32" />{[1, 2].map((card) => <Skeleton key={card} className="mb-3 h-64 rounded-xl" />)}</div>)}</div></div>;
}
