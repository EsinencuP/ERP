"use client";
import { useI18n } from "@/i18n/use-i18n";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { PaginatedResponse, Result } from "@/types/shared";
import { getEmployees } from "../actions";
import type { Employee } from "../types";

/** Search bounded employee candidates for manager and leave forms; final eligibility is checked by the server. */
export function EmployeePicker({ selected, excludeId, disabled, onSelect, label = "Руководитель", emptyLabel = "Без руководителя", eligibleOnly = false }: { selected: { id: string; name: string } | null; excludeId?: string; disabled: boolean; onSelect: (employee: { id: string; name: string } | null) => void; label?: string; emptyLabel?: string; eligibleOnly?: boolean }) {
  const { t } = useI18n();

  const id = useId(), [search, setSearch] = useState(""), query = useDebouncedValue(search, 300), [data, setData] = useState<Result<PaginatedResponse<Employee>> | null>(null);
  useEffect(() => { let current = true; setData(null); getEmployees({ search: query, pageSize: 20 }).then((result) => { if (current) setData(result); }).catch(() => { if (current) setData({ ok: false, error: { code: "STORAGE", message: t("Не удалось загрузить сотрудников") } }); }); return () => { current = false; }; }, [query]);
  return <div className="motion-fade space-y-2"><label htmlFor={id} className="block text-xs font-medium">{t(label)}</label><div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3 text-xs"><span className="min-w-0 break-words">{selected?.name ?? t(emptyLabel)}</span>{selected && <Button type="button" variant="ghost" disabled={disabled} onClick={function handleClear() { onSelect(null); }}>{t("Убрать")}</Button>}</div><Input id={id} type="search" maxLength={200} disabled={disabled} placeholder={t("Поиск по имени или номеру")} value={search} onChange={function handleSearch(event) { setSearch(event.target.value); }} /><div aria-live="polite" className="text-xs text-muted-foreground">{!data ? t("Загрузка сотрудников…") : !data.ok ? t(data.error.message) : data.data.total > 20 ? t("Первые 20 совпадений. Уточните поиск.") : t`Найдено: ${data.data.data.filter((row) => row.id !== excludeId).length}`}</div>{data?.ok && <ul aria-label={t`Результаты поиска: ${t(label)}`} className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-1">{data.data.data.filter((row) => row.id !== excludeId).map((row) => <li key={row.id}><button type="button" disabled={disabled || (eligibleOnly && row.status === "TERMINATED")} aria-pressed={selected?.id === row.id} className="motion-fade w-full rounded-md px-3 py-2 text-left text-xs hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50" onClick={function handleSelect() { onSelect({ id: row.id, name: row.name }); }}><span className="block truncate font-medium">{row.name}</span><span className="text-muted-foreground">{row.employeeId} · {row.position || t("Должность не указана")}{row.status === "TERMINATED" ? t(" · Неактивен") : ""}</span></button></li>)}</ul>}</div>;
}

/** Preserve the manager form API while sharing employee search with leave applications. */
export function EmployeeManagerPicker(props: { selected: { id: string; name: string } | null; excludeId?: string; disabled: boolean; onSelect: (employee: { id: string; name: string } | null) => void }) { return <EmployeePicker {...props} />; }
