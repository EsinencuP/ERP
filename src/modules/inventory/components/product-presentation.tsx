import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { StockStatus } from "../types";

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = { in_stock: "В наличии", low_stock: "Мало на складе", out_of_stock: "Нет в наличии" };
/** Show stock states with text and shared success/amber/red semantic tokens. */
export function StockStatusBadge({ status }: { status: StockStatus }) { return <Badge className="whitespace-nowrap" status={STOCK_STATUS_LABELS[status]} data-stock-status={status} />; }
/** Navigate the normalized product catalog and preserved legacy documents. */
export function InventoryNavigation({ legacy = false, section = legacy ? "legacy" : "products" }: { legacy?: boolean; section?: "dashboard" | "products" | "warehouses" | "legacy" }) {
  return <nav aria-label="Разделы склада" className="motion-fade mb-6 flex w-fit max-w-full flex-wrap gap-1 rounded-xl border p-1 text-xs">{[{ href: "/inventory/dashboard", label: "Обзор", key: "dashboard" }, { href: "/inventory", label: "Товары", key: "products" }, { href: "/inventory/warehouses", label: "Склады", key: "warehouses" }, { href: "/inventory/documents", label: "Прежний реестр", key: "legacy" }].map((item) => <Link key={item.href} href={item.href} aria-current={item.key === section ? "page" : undefined} className={`rounded-lg px-3 py-2 ${item.key === section ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>{item.label}</Link>)}</nav>;
}
