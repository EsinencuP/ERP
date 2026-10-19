import { formatCurrency } from "@/lib/utils";

/** Find an exact maximum for chart projection; keep money itself as integer strings. */
export function getChartMaximum(amounts: readonly string[]): string {
  return amounts.reduce((maximum, amount) => BigInt(amount) > maximum ? BigInt(amount) : maximum, 1n).toString();
}

/** Project money onto a bounded 0–100 visual scale; only the bounded ratio becomes Number. */
export function getChartValue(amount: string, maximum: string): number {
  return Number(BigInt(amount) * 1000000n / BigInt(maximum)) / 10000;
}

/** Label chart ticks compactly; exact unrounded amounts remain in tooltips and data tables. */
export function getChartTick(value: number, maximum: string, currency: string): string {
  const amount = BigInt(maximum) * BigInt(Math.max(0, Math.round(value * 10000))) / 1000000n;
  const units = [[100000000000000n, "трлн"], [100000000000n, "млрд"], [100000000n, "млн"], [100000n, "тыс."]] as const;
  const unit = units.find(([scale]) => amount >= scale);
  if (!unit) return formatCurrency(amount, currency);
  const tenths = amount * 10n / unit[0];
  return `${tenths / 10n}${tenths % 10n ? `,${tenths % 10n}` : ""} ${unit[1]}`;
}
