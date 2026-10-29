import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Render the shared buttonVariants primitive with semantic design tokens. */
export const buttonVariants = cva("inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 motion", {
  variants: {
    variant: {
      default: "bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-text))] hover:bg-[hsl(var(--color-primary-hover))]",
      outline: "border bg-[hsl(var(--color-surface))] text-[hsl(var(--color-text))] hover:bg-[hsl(var(--color-hover))]",
      ghost: "text-[hsl(var(--color-muted))] hover:bg-[hsl(var(--color-hover))] hover:text-[hsl(var(--color-text))]",
      destructive: "bg-[hsl(var(--color-danger-soft))] text-[hsl(var(--color-danger))] hover:opacity-80",
      secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
      link: "text-primary underline-offset-4 hover:underline",
    },
    size: { default: "h-10 px-4", sm: "h-8 px-3", lg: "h-11 px-6", icon: "size-9" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

/** Shadcn-style polymorphic button with semantic CSS-variable variants. */
export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean }>(function Button({ className, variant, size, asChild = false, ...props }, ref) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
