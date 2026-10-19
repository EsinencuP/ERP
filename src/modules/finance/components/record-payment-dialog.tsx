"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { err, ok } from "@/lib/errors";
import { formatCurrency } from "@/lib/utils";
import type { Result } from "@/types/shared";
import { createInvoicePayment, getPayableInvoices } from "../actions";
import type { Invoice, InvoicePaymentInput } from "../types";
import { InvoicePaymentDialog } from "./invoice-payment-dialog";
import { InvoiceStatusBadge } from "./invoice-presentation";

/** Pick an issued invoice and reuse the versioned payment dialog without trusting client balances. */
export function RecordPaymentDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [search, setSearch] = useState(""), value = useDebouncedValue(search, 300);
  const [options, setOptions] = useState<Result<{ data: Invoice[]; total: number }> | null>(null), [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Invoice | null>(null), [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false), saving = useRef(false);
  useEffect(() => { let active = true; setLoading(true); getPayableInvoices(value).then((result) => { if (active) setOptions(result); }).catch(() => { if (active) setOptions(err("STORAGE", "Не удалось найти счета")); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [value]);
  async function handleSave(input: InvoicePaymentInput): Promise<Result<true>> {
    if (!selected || saving.current || blocked) return err("CONFLICT", "Обновите список счетов перед записью");
    saving.current = true; setBusy(true);
    try {
      const result = await createInvoicePayment(selected.id, selected.version, input);
      if (!result.ok) { setBlocked(result.error.code !== "VALIDATION"); return result; }
      onSaved(); return ok(true);
    } catch { setBlocked(true); return err("STORAGE", "Результат записи неизвестен. Закройте окно, обновите реестр и проверьте платежи перед повтором"); }
    finally { saving.current = false; setBusy(false); }
  }
  function handleClose() { if (!saving.current) onClose(); }
  if (selected) return <InvoicePaymentDialog invoice={selected} onSave={handleSave} onClose={handleClose} busy={busy} blocked={blocked} />;
  return <Dialog open onOpenChange={function handleOpen(open) { if (!open) handleClose(); }}><DialogContent className="motion-fade flex max-h-[90dvh] max-w-xl flex-col overflow-hidden"><DialogTitle>Выберите счёт для оплаты</DialogTitle><DialogDescription className="mt-2 text-xs text-muted-foreground">Только отправленные счета с остатком. Платёж привязывается к выбранному счёту.</DialogDescription><label htmlFor="payment-invoice-search" className="sr-only">Найти счёт для оплаты</label><Input id="payment-invoice-search" type="search" maxLength={200} placeholder="Номер или имя клиента" value={search} onChange={function handleSearch(event) { setSearch(event.target.value); }} className="mt-4" />
    <div className="mt-4 min-h-0 space-y-2 overflow-y-auto">{loading ? <Skeleton className="h-32" /> : options && !options.ok ? <p role="alert" className="text-sm text-destructive">{options.error.message}</p> : options?.ok ? <>{options.data.data.map((invoice) => <Button key={invoice.id} variant="outline" className="h-auto w-full flex-wrap justify-between gap-3 p-4 text-left" onClick={function handleSelect() { setSelected(invoice); }}><span className="min-w-0"><span className="block font-mono text-xs">{invoice.number}</span><span className="mt-1 block max-w-64 truncate text-xs text-muted-foreground">{invoice.customer.company || invoice.customer.name}</span></span><span className="space-y-2 text-right"><span className="block font-mono text-xs">{formatCurrency(invoice.balance, invoice.currency)}</span><InvoiceStatusBadge status={invoice.status} /></span></Button>)}{!options.data.data.length && <p className="py-6 text-center text-sm text-muted-foreground">Неоплаченных выданных счетов не найдено.</p>}<p className="pt-2 text-xs text-muted-foreground">Найдено: {options.data.total}. Показано до 20 счетов каждого статуса; уточните поиск.</p></> : null}</div><Button variant="outline" className="mt-4 self-end" onClick={handleClose}>Отмена</Button>
  </DialogContent></Dialog>;
}
