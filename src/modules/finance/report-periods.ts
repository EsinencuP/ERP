export type PnlPeriod = "month" | "quarter" | "year" | "custom";
export const PNL_PERIOD_LABELS: Record<PnlPeriod, string> = { month: "This Month", quarter: "Quarter", year: "Year", custom: "Custom" };
export const PNL_TIMEZONE = "Europe/Moscow";

/** Resolve inclusive calendar periods in the workspace's current Moscow reporting timezone. */
export function getPnlPeriod(period: Exclude<PnlPeriod, "custom">, asOf = new Date()): { from: string; to: string } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: PNL_TIMEZONE, year: "numeric", month: "2-digit" }).formatToParts(asOf);
  const year = Number(parts.find((part) => part.type === "year")?.value), month = Number(parts.find((part) => part.type === "month")?.value);
  const firstMonth = period === "year" ? 1 : period === "quarter" ? Math.floor((month - 1) / 3) * 3 + 1 : month;
  const lastMonth = firstMonth + (period === "year" ? 11 : period === "quarter" ? 2 : 0);
  const from = `${String(year).padStart(4, "0")}-${String(firstMonth).padStart(2, "0")}-01`;
  const end = new Date(0); end.setUTCFullYear(year, lastMonth, 0);
  return { from, to: end.toISOString().slice(0, 10) };
}
