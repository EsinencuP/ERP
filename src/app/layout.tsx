import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = { title: { default: "Evo ERP — рабочее пространство", template: "%s · Evo ERP" }, description: "Модульный ERP-шаблон: CRM, финансы, склад, команда и проекты." };

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "cyrillic"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "cyrillic"], display: "swap" });

/** Load self-hosted Geist subsets through Next.js and share theme and notification providers. */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru" className="dark" suppressHydrationWarning><body className={`${geistSans.variable} ${geistMono.variable}`}><ThemeProvider><a href="#main-content" className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-[hsl(var(--color-primary))] p-3 text-[hsl(var(--color-primary-text))] focus:not-sr-only">К содержимому</a>{children}<Toaster /></ThemeProvider></body></html>; }
