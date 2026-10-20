import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { NextIntlClientProvider } from "next-intl";
import { getI18n } from "@/i18n/server";
import "./globals.css";

/** Describe the application in the same language as the server-rendered interface. */
export async function generateMetadata(): Promise<Metadata> { const { t } = await getI18n(); return { title: { default: t("Evo ERP — рабочее пространство"), template: "%s · Evo ERP" }, description: t("Модульный ERP-шаблон: CRM, финансы, склад, команда и проекты.") }; }

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "cyrillic"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "cyrillic"], display: "swap" });

/** Load self-hosted Geist subsets through Next.js and share theme and notification providers. */
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { const { locale, t } = await getI18n(); return <html lang={locale} className="dark" suppressHydrationWarning><body className={`${geistSans.variable} ${geistMono.variable}`}><NextIntlClientProvider locale={locale} messages={null} timeZone="Europe/Moscow"><ThemeProvider><a href="#main-content" className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-[hsl(var(--color-primary))] p-3 text-[hsl(var(--color-primary-text))] focus:not-sr-only">{t("К содержимому")}</a>{children}<Toaster /></ThemeProvider></NextIntlClientProvider></body></html>; }
