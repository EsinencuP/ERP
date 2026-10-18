import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

/** Render the shared badgeVariants primitive with semantic design tokens. */
export const badgeVariants = cva("inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium motion-fade", {
  variants: { variant: { default: "border-transparent bg-primary text-primary-foreground", secondary: "border-transparent bg-secondary text-secondary-foreground", destructive: "border-transparent bg-destructive text-destructive-foreground", outline: "border-border text-foreground" } },
  defaultVariants: { variant: "default" },
});

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants> & { status?: string };

/** Display a status using text, a dot and a semantic color token. */
export function Badge({ status, className, children, variant, style, ...props }: BadgeProps) {
  if (!status) return <span className={cn(badgeVariants({ variant }), className)} style={style} {...props}>{children}</span>;
  const tone = ["Оплачен", "Выиграна", "Завершён", "В наличии", "Работает"].includes(status) ? "success" : ["Проиграна", "Нет в наличии", "Неактивен", "Просрочен"].includes(status) ? "danger" : ["Переговоры", "В отпуске", "Мало на складе", "Частично оплачен", "На проверке"].includes(status) ? "warning" : "info";
  return <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium motion", className)} style={{ color: `hsl(var(--color-${tone}))`, background: `hsl(var(--color-${tone}-soft))`, ...style }} {...props}><span className="status-dot" />{status}</span>;
}
