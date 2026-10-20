import "server-only";
import { createTranslator } from "@/i18n/translate";
import { DEFAULT_LOCALE, intlLocale, type Locale } from "@/i18n/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Document, Font, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { err, ok } from "@/lib/errors";
import { formatCurrency } from "@/lib/utils";
import type { Result } from "@/types/shared";
import type { Invoice } from "./types";

// React-pdf requires a static TTF instance, rather than the upstream variable font.
Font.register({ family: "Geist", src: path.join(process.cwd(), "public/fonts/Geist-Regular.ttf") });
Font.registerHyphenationCallback((word) => word.length > 24 ? word.match(/.{1,24}/gu) ?? [word] : [word]);
// Bound each unbreakable row, including descriptions containing many hard newlines.
function splitDescription(value: string): string[] {
  const result: string[] = []; let chunk = ""; let lines = 0;
  for (const line of value.split("\n")) {
    const words = line.match(/\S+|[ \t]+/gu) ?? [""];
    for (const word of words) {
      if (chunk.length + word.length > 300 || lines >= 8) { if (chunk) result.push(chunk); chunk = ""; lines = 0; }
      if (word.length > 300) { if (chunk) result.push(chunk); const parts = word.match(/.{1,300}/gu) ?? [word]; result.push(...parts.slice(0, -1)); chunk = parts.at(-1) ?? ""; }
      else chunk += word;
    }
    chunk += "\n"; lines++;
  }
  if (chunk.trim()) result.push(chunk.trim()); return result.length ? result : [value];
}
type Palette = { foreground: string; muted: string; primary: string; border: string; surface: string };
async function getPalette(): Promise<Result<Palette>> {
  try {
    const css = await readFile(path.join(process.cwd(), "src/app/globals.css"), "utf8"), root = css.split(":root {")[1]?.split("}")[0] ?? "";
    function token(name: string) { const match = root.match(new RegExp(`--color-${name}:\\s*([0-9.]+)\\s+([0-9.]+)%\\s+([0-9.]+)%`)); return match ? `hsl(${match[1]}, ${match[2]}%, ${match[3]}%)` : null; }
    const foreground = token("foreground"), muted = token("muted"), primary = token("primary"), border = token("border"), surface = token("surface");
    return foreground && muted && primary && border && surface ? ok({ foreground, muted, primary, border, surface }) : err("CONFIGURATION", "Не найдены CSS токены для PDF");
  } catch { return err("CONFIGURATION", "Не удалось загрузить палитру PDF"); }
}
function InvoicePdf({ invoice, palette, locale }: { invoice: Invoice; palette: Palette; locale: Locale }) {
  const t = createTranslator(locale);
  const day = (value: string) => new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  const money = (value: string) => formatCurrency(value, invoice.currency, locale).replace(/\u00a0|\u202f/g, " ");
  const status = { DRAFT: t("ЧЕРНОВИК"), SENT: t("ОТПРАВЛЕН"), OVERDUE: t("ПРОСРОЧЕН"), PAID: t("ОПЛАЧЕН"), CANCELLED: t("ОТМЕНЁН") }[invoice.status];
  const rowStyle = { flexDirection: "row" as const, borderBottomWidth: 0.5, borderBottomColor: palette.border, paddingVertical: 10, alignItems: "flex-start" as const };
  return <Document title={t`Счёт ${invoice.number}`} author={invoice.issuerName} language={locale}><Page size="A4" style={{ fontFamily: "Geist", fontSize: 9, color: palette.foreground, backgroundColor: palette.surface, paddingHorizontal: 42, paddingTop: 100, paddingBottom: 65 }}>
    <View fixed style={{ position: "absolute", top: 28, left: 42, right: 42, flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: palette.primary, paddingBottom: 14 }}><View style={{ width: "47%" }}><Text style={{ fontSize: 16, lineHeight: 1.4, color: palette.primary }}>{t("Счёт на оплату")}</Text><Text style={{ marginTop: 6, fontSize: 8, color: palette.muted }}></Text></View><View style={{ width: "50%", alignItems: "flex-end" }}><Text style={{ fontSize: 15, lineHeight: 1.4 }}>{invoice.number}</Text><Text style={{ marginTop: 4, fontSize: 8, color: palette.muted }}>{t(status)}</Text></View></View>
    <View style={{ marginBottom: 18 }}><Text style={{ fontSize: 8, color: palette.muted, marginBottom: 5 }}>{t("ИСПОЛНИТЕЛЬ")}</Text><Text style={{ fontSize: 12 }}>{invoice.issuerName}</Text></View>
    <View style={{ flexDirection: "row", gap: 24, marginBottom: 24 }}><View style={{ width: "60%" }}><Text style={{ fontSize: 8, color: palette.muted, marginBottom: 5 }}>{t("КЛИЕНТ")}</Text><Text style={{ fontSize: 12 }}>{invoice.customer.company || invoice.customer.name}</Text><Text>{invoice.customer.name}</Text>{invoice.customer.email && <Text style={{ color: palette.muted }}>{invoice.customer.email}</Text>}{invoice.customer.address && <Text style={{ color: palette.muted }}>{invoice.customer.address}</Text>}</View><View style={{ width: "35%" }}><Text style={{ color: palette.muted }}>{t("Дата счёта")}</Text><Text>{day(invoice.issueDate)}</Text><Text style={{ color: palette.muted, marginTop: 9 }}>{t("Оплатить до")}</Text><Text>{day(invoice.dueDate)}</Text><Text style={{ color: palette.muted, marginTop: 9 }}>{t("Валюта: ")}{invoice.currency}</Text></View></View>
    <View style={{ ...rowStyle, color: palette.muted, paddingVertical: 7 }}><Text style={{ width: "45%" }}>{t("Описание")}</Text><Text style={{ width: "13%", textAlign: "right" }}>{t("Кол-во")}</Text><Text style={{ width: "21%", textAlign: "right" }}>{t("Цена")}</Text><Text style={{ width: "21%", textAlign: "right" }}>{t("Сумма")}</Text></View>
    {invoice.items.flatMap((item) => splitDescription(item.description).map((description, index) => <View key={`${item.id}:${index}`} wrap={false} style={rowStyle}><Text style={{ width: "45%", paddingRight: 12, lineHeight: 1.35 }}>{index ? t("(продолжение) ") : ""}{description}</Text><Text style={{ width: "13%", textAlign: "right" }}>{index ? "" : locale === "ru" ? item.quantity.replace(".", ",") : item.quantity}</Text><Text style={{ width: "21%", textAlign: "right", paddingLeft: 6 }}>{index ? "" : money(item.unitPrice)}</Text><Text style={{ width: "21%", textAlign: "right", paddingLeft: 6 }}>{index ? "" : money(item.total)}</Text></View>))}
    <View wrap={false} style={{ marginTop: 22, marginLeft: "45%" }}>{[[t("Подытог"), invoice.subtotal], [t`Налог ${locale === "ru" ? invoice.taxRate.replace(".", ",") : invoice.taxRate}%`, invoice.taxAmount], [t("ИТОГО"), invoice.total], [t("Оплачено"), invoice.paid], [t("К оплате"), invoice.balance]].map(([label, value]) => <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}><Text style={{ color: label === t("ИТОГО") ? palette.primary : palette.muted }}>{t(label)}</Text><Text style={{ fontSize: label === t("ИТОГО") ? 12 : 9 }}>{money(value ?? "0")}</Text></View>)}</View>
    {invoice.notes && <View style={{ marginTop: 24, borderTopWidth: 0.5, borderTopColor: palette.border, paddingTop: 12 }}><Text style={{ color: palette.muted, fontSize: 8, marginBottom: 5 }}>{t("КОММЕНТАРИЙ")}</Text><Text>{invoice.notes}</Text></View>}
    <Text fixed style={{ position: "absolute", bottom: 26, left: 42, right: 42, color: palette.muted, fontSize: 8, textAlign: "right" }} render={({ pageNumber, totalPages }) => `${invoice.number} | ${pageNumber} / ${totalPages}`} />
  </Page></Document>;
}
/** Generate a self-contained Cyrillic invoice PDF from one authorized persisted snapshot. */
export async function createInvoicePdf(invoice: Invoice, locale: Locale = DEFAULT_LOCALE): Promise<Result<Uint8Array>> {
  const palette = await getPalette(); if (!palette.ok) return palette;
  try { return ok(new Uint8Array(await renderToBuffer(<InvoicePdf invoice={invoice} palette={palette.data} locale={locale} />))); }
  catch { return err("STORAGE", "Не удалось сформировать PDF счёта"); }
}
