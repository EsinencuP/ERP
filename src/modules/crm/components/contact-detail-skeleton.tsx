import { Skeleton } from "@/components/ui/skeleton";

/** Preserve record header and two-column geometry during the initial server read. */
export function ContactDetailSkeleton() {
  return <div className="motion-fade space-y-6" role="status" aria-label="Загрузка карточки контакта"><span className="sr-only">Загрузка карточки контакта…</span><Skeleton className="h-4 w-32" /><div className="panel flex items-center gap-5 p-6" aria-hidden="true"><Skeleton className="size-16 rounded-full" /><div className="flex-1 space-y-4"><Skeleton className="h-7 w-2/3" /><Skeleton className="h-5 w-24" /></div></div><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]" aria-hidden="true"><div className="space-y-5"><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div><Skeleton className="h-96 rounded-2xl" /></div></div>;
}
