"use client";
import { useI18n } from "@/i18n/use-i18n";


import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Render the shared Dialog primitive with semantic design tokens. */
export const Dialog = DialogPrimitive.Root;
/** Render the shared DialogTrigger primitive with semantic design tokens. */
export const DialogTrigger = DialogPrimitive.Trigger;
/** Render the shared DialogClose primitive with semantic design tokens. */
export const DialogClose = DialogPrimitive.Close;
/** Render the shared DialogTitle primitive with semantic design tokens. */
export const DialogTitle = DialogPrimitive.Title;
/** Render the shared DialogDescription primitive with semantic design tokens. */
export const DialogDescription = DialogPrimitive.Description;
/** Render the shared DialogPortal primitive with semantic design tokens. */
export const DialogPortal = DialogPrimitive.Portal;

/** Group dialog headings using the shared spacing and entrance treatment. */
export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("motion-fade flex flex-col gap-2 text-left", className)} {...props} />; }

/** Align dialog actions consistently across desktop and narrow layouts. */
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("motion-fade flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />; }

/** Radix modal with focus trapping, escape handling and a labelled close control. */
export function DialogContent({ children, className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  const { t } = useI18n();

  return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[hsl(var(--color-overlay))] backdrop-blur-sm" style={{ animation: "overlay-in 150ms ease-out" }} /><DialogPrimitive.Content className={cn("motion-fade fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-[hsl(var(--color-surface))] p-6 shadow-2xl", className)} {...props}>{children}<DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1.5 text-[hsl(var(--color-muted))] hover:bg-[hsl(var(--color-hover))]" aria-label={t("Закрыть")}><X className="size-4" /></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>;
}
