import { cn } from "@/lib/utils"

/** Render the shared Skeleton primitive with semantic design tokens. */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("motion-skeleton rounded-md bg-primary/10", className)}
      {...props}
    />
  )
}

export { Skeleton }
