import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { formatDecimal } from "@/lib/utils";
import type { StockStatus } from "./types";

/** Convert an exact nonnegative decimal quantity to thousandths without floating-point arithmetic. */
export function stockToMilli(value: string): bigint { const [whole = "0", fraction = ""] = value.split("."); return BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, "0")); }
/** Convert an exact signed movement delta to thousandths after schema validation. */
export function stockDeltaToMilli(value: string): bigint { return value.startsWith("-") ? -stockToMilli(value.slice(1)) : stockToMilli(value); }
/** Serialize integer thousandths exactly for PostgreSQL decimal quantities. */
export function milliToStock(value: bigint): string { const absolute = value < 0n ? -value : value; return `${value < 0n ? "-" : ""}${absolute / 1000n}.${(absolute % 1000n).toString().padStart(3, "0")}`; }
/** Derive availability from total physical stock and the product's own threshold. */
export function getStockStatus(stock: string, minStock: string): StockStatus { const qty = stockToMilli(stock); return qty === 0n ? "out_of_stock" : qty <= stockToMilli(minStock) ? "low_stock" : "in_stock"; }
/** Display exact quantities, including totals larger than the safe integer range. */
export function formatStockQuantity(value: string, locale: Locale = DEFAULT_LOCALE): string {
  if (!/^-?\d+(\.\d{1,3})?$/.test(value)) return "—";
  return formatDecimal(value, locale);
}
