"use client";
import { useI18n } from "@/i18n/use-i18n";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getContacts } from "@/modules/crm/actions";
import type { ContactTableRow } from "@/modules/crm/types";
import type { UseFormRegisterReturn } from "react-hook-form";

/** Search bounded tenant contacts while keeping an already selected invoice customer available. */
export function InvoiceContactPicker({ registration, initial, value: selectedId, disabled, error }: { registration: UseFormRegisterReturn<"contactId">; initial?: { id: string; name: string }; value: string; disabled: boolean; error: string | undefined }) {
  const { t } = useI18n();

  const [selected, setSelected] = useState(initial ?? null);
  const [search, setSearch] = useState(""); const value = useDebouncedValue(search, 300);
  const [contacts, setContacts] = useState<ContactTableRow[]>([]); const [failure, setFailure] = useState(""); const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; setLoading(true); getContacts({ search: value, pageSize: 20 }).then((result) => { if (!active) return; if (result.ok) { setContacts(result.data.data); setFailure(""); } else setFailure(result.error.message); }).catch(() => { if (active) setFailure(t("Не удалось загрузить клиентов")); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [value]);
  return <div className="relative space-y-2"><label htmlFor="invoice-contact-search" className="text-xs font-medium">{t("Найти клиента")}</label><Input id="invoice-contact-search" value={search} maxLength={200} disabled={disabled} onChange={function handleSearch(event) { setSearch(event.target.value); }} placeholder={t("Имя или компания из CRM")} /><label htmlFor="invoice-customer" className="block text-xs font-medium">{t("Клиент *")}</label><select id="invoice-customer" className="input w-full" {...registration} value={selectedId} onChange={function handleSelect(event) { const contact = contacts.find((row) => row.id === event.target.value); setSelected(contact ? { id: contact.id, name: contact.name } : null); void registration.onChange(event); }} disabled={disabled} aria-invalid={Boolean(error)} aria-describedby="invoice-customer-error"><option value="">{t("Выберите контакт")}</option>{selected && !contacts.some((contact) => contact.id === selected.id) && <option value={selected.id}>{selected.name}</option>}{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}{contact.company ? ` · ${contact.company}` : ""}</option>)}</select>{loading && <p className="text-xs text-muted-foreground" role="status">{t("Загрузка клиентов…")}</p>}<p id="invoice-customer-error" role={error || failure ? "alert" : undefined} className="text-xs text-destructive">{t(error || failure)}</p><p className="text-[11px] text-muted-foreground">{t("До 20 результатов. Новый клиент создаётся в CRM.")}</p></div>;
}
