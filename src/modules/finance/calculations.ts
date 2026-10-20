import { err, ok } from "@/lib/errors";
import type { Result } from "@/types/shared";
import { invoiceItemSchema, invoiceMajorPriceSchema } from "./schema";

const maximum = 99999999999999999999n;
/** Convert a validated positive decimal quantity/rate to an exact scaled integer. */
export function scaleDecimal(value: string, places: number): bigint { const [whole = "0", fraction = ""] = value.split("."); return BigInt(whole) * 10n ** BigInt(places) + BigInt(fraction.padEnd(places, "0")); }
/** Parse a price entered in major currency units; never pass arbitrary money through Number. */
export function parseInvoicePrice(value: string): Result<string> {
  const normalized = value.trim().replace(",", ".");
  return invoiceMajorPriceSchema.safeParse(normalized).success ? ok(scaleDecimal(normalized, 2).toString()) : err("VALIDATION", "Цена: число с точностью до евроценты");
}
/** Format exact stored minor units for an editable two-decimal price field. */
export function invoicePriceInput(value: string): string { const signed = BigInt(value), amount = signed < 0n ? -signed : signed; return `${signed < 0n ? "-" : ""}${amount / 100n}.${(amount % 100n).toString().padStart(2, "0")}`; }
/** Round each quantity×price line and tax half up to a minor unit, matching PostgreSQL CHECKs. */
export function calculateInvoice(items: readonly { description: string; quantity: string; unitPrice: string }[], taxRate: string): Result<{ lineTotals: string[]; subtotal: string; taxAmount: string; total: string }> {
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(taxRate) || scaleDecimal(taxRate, 2) > 10000n) return err("VALIDATION", "Налог от 0 до 100%");
  let subtotal = 0n; const lineTotals: string[] = [];
  for (const item of items) {
    if (!invoiceItemSchema.safeParse(item).success) return err("VALIDATION", "Проверьте описание, количество и цену строки");
    const line = (scaleDecimal(item.quantity, 3) * BigInt(item.unitPrice) + 500n) / 1000n;
    if (line > maximum) return err("VALIDATION", "Сумма строки превышает 20 цифр в евроцентах");
    subtotal += line; lineTotals.push(line.toString());
  }
  const tax = (subtotal * scaleDecimal(taxRate, 2) + 5000n) / 10000n, total = subtotal + tax;
  if (total > maximum) return err("VALIDATION", "Итог превышает 20 цифр в евроцентах");
  return ok({ lineTotals, subtotal: subtotal.toString(), taxAmount: tax.toString(), total: total.toString() });
}
