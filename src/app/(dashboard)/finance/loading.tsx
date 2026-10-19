import { Skeleton } from "@/components/ui/skeleton";
/** Show a stable finance loading state while server queries resolve. */
export default function Loading() { return <div className="motion-fade space-y-5" role="status" aria-label="Загрузка финансов"><Skeleton className="h-10 w-52" /><Skeleton className="h-24 w-full" /><Skeleton className="h-80 w-full" /></div>; }
