import { Skeleton } from "@/components/ui/skeleton";

/** Preserve contact table geometry while a server page or filter request is pending. */
export function ContactsTableSkeleton() {
  return <div role="status" aria-label="Загрузка контактов" className="motion-fade panel overflow-hidden">
    <span className="sr-only">Загрузка контактов…</span>
    <div className="grid grid-cols-[2fr_1fr_1fr] gap-8 border-b px-6 py-4" aria-hidden="true">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-3 w-24" />)}</div>
    <div aria-hidden="true">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="flex items-center gap-4 border-b px-6 py-5 last:border-0"><Skeleton className="size-4" /><Skeleton className="size-9 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-36" /><Skeleton className="h-2 w-24" /></div><Skeleton className="hidden h-3 w-36 sm:block" /><Skeleton className="h-6 w-20 rounded-md" /></div>)}</div>
  </div>;
}
