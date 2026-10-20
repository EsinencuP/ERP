"use client";
import { useI18n } from "@/i18n/use-i18n";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Mount accessible notifications using the shared semantic palette. */
export function Toaster(props: ToasterProps) {
  const { t } = useI18n();
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "light" ? "light" : "dark";
  return <Sonner containerAriaLabel={t("Notifications")} theme={theme} position="bottom-right" closeButton toastOptions={{ closeButtonAriaLabel: t("Close notification"), unstyled: true, classNames: { toast: "motion-fade flex w-full items-center gap-3 rounded-xl border border-border bg-popover p-4 font-sans text-sm text-popover-foreground shadow-lg", title: "font-medium", description: "mt-1 text-xs text-muted-foreground", actionButton: "rounded-md bg-primary px-3 py-1.5 text-primary-foreground", cancelButton: "rounded-md bg-muted px-3 py-1.5 text-muted-foreground", closeButton: "border-border bg-surface text-foreground" } }} {...props} />;
}
