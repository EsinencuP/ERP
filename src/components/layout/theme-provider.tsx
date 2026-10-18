"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Persist a class-based theme and apply it before hydration to avoid a color flash. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="erp-theme" disableTransitionOnChange>{children}</NextThemesProvider>;
}
