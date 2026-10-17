import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional Tailwind classes for shared UI primitives. */
export function cn(...inputs: ClassValue[]): string { return twMerge(clsx(inputs)); }

/** Format integer minor currency units as Russian rubles. */
export function money(amount: number, compact = false): string {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0, ...(compact ? { notation: "compact" } : {}) }).format(amount / 100);
}

/** Format a persisted ISO date without depending on the machine timezone. */
export function dateLabel(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "Europe/Moscow" }).format(date);
}

/** Produce a short avatar label from a person's or company's name. */
export function initials(value: string): string { return value.split(" ").filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase(); }
