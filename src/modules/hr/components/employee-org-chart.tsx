"use client";
import { useI18n } from "@/i18n/use-i18n";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, GitBranch, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorPanel } from "@/components/ui/feedback";
import { Skeleton } from "@/components/ui/skeleton";
import type { Result } from "@/types/shared";
import { getEmployeeOrgChart } from "../actions";
import type { OrgEmployee } from "../types";
import { EmployeeAvatar, EmployeeStatusBadge } from "./employee-presentation";

/** Render one manager branch recursively using native buttons and nested list semantics. */
function EmployeeBranch({ employee, childrenByManager, depth }: { employee: OrgEmployee; childrenByManager: Map<string | null, OrgEmployee[]>; depth: number }) {
  const { t } = useI18n();

  const children = childrenByManager.get(employee.id) ?? [], [open, setOpen] = useState(depth < 1), id = useId();
  return <li className="motion-fade min-w-0" data-org-employee={employee.id}><article className="panel flex min-w-[290px] max-w-2xl flex-wrap items-center gap-3 p-4"><EmployeeAvatar name={employee.name} /><div className="min-w-0 flex-1"><h2 className="break-words text-sm font-semibold"><Link href={`/hr/${employee.id}`} className="hover:text-primary hover:underline">{employee.name}</Link></h2><p className="mt-1 break-words text-xs text-muted-foreground">{employee.position || t("Должность не указана")}</p><p className="mt-1 break-words text-[10px] text-muted-foreground">{employee.department || t("Отдел не указан")} · {employee.employeeId}</p></div><EmployeeStatusBadge status={employee.status} />{children.length > 0 && <Button variant="outline" className="w-full justify-start text-xs" aria-expanded={open} aria-controls={id} aria-label={t`${open ? t("Свернуть") : t("Развернуть")} подчинённых: ${employee.name}`} onClick={function handleToggle() { setOpen((value) => !value); }}>{open ? <ChevronDown /> : <ChevronRight />}{t("Прямых подчинённых: ")}{children.length}</Button>}</article>{children.length > 0 && <ul id={id} hidden={!open} className="ml-3 mt-3 space-y-3 border-l border-primary/25 pl-3 sm:ml-6 sm:pl-6">{open && children.map((child) => <EmployeeBranch key={child.id} employee={child} childrenByManager={childrenByManager} depth={depth + 1} />)}</ul>}</li>;
}

/** Display the full workspace manager forest with expandable recursive branches and explicit failures. */
export function EmployeeOrgChart({ initialData }: { initialData: Result<OrgEmployee[]> }) {
  const { t } = useI18n();

  const [data, setData] = useState(initialData), [loading, setLoading] = useState(false), [revision, setRevision] = useState(0);
  const childrenByManager = useMemo(() => { const map = new Map<string | null, OrgEmployee[]>(); if (data.ok) for (const employee of data.data) { const siblings = map.get(employee.managerId) ?? []; siblings.push(employee); map.set(employee.managerId, siblings); } return map; }, [data]);
  async function handleRefresh() { if (loading) return; setLoading(true); try { setData(await getEmployeeOrgChart()); setRevision((value) => value + 1); } catch { setData({ ok: false, error: { code: "STORAGE", message: t("Не удалось загрузить оргструктуру") } }); } finally { setLoading(false); } }
  return <section className="motion-fade min-w-0 space-y-6" aria-labelledby="employee-org-title"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-3">{t("HR / Organization")}</p><h1 id="employee-org-title" className="flex items-center gap-3 text-2xl font-semibold sm:text-3xl"><GitBranch className="size-6 text-primary" />{t("Оргструктура")}</h1><p className="mt-3 max-w-xl text-sm text-muted-foreground">{t("Связи руководителей и сотрудников. Разверните ветку, чтобы увидеть команду.")}</p></div><Button size="icon" variant="outline" aria-label={t("Обновить оргструктуру")} disabled={loading} onClick={handleRefresh}><RefreshCw /></Button></header>
    {loading ? <div role="status" aria-label={t("Загрузка оргструктуры")}><Skeleton className="h-72" /></div> : !data.ok ? <ErrorPanel error={data.error} /> : !data.data.length ? <div className="panel"><EmptyState title={t("Оргструктура пока пуста")} description={t("Добавьте сотрудников и выберите руководителей в их профилях.")} /><div className="pb-6 text-center"><Button asChild variant="outline"><Link href="/hr">{t("К сотрудникам")}</Link></Button></div></div> : <><p className="text-xs text-muted-foreground">{t("Сотрудников: ")}{data.data.length} {t(" · Без руководителя: ")}{childrenByManager.get(null)?.length ?? 0}{t(". Показаны все статусы.")}</p><div className="min-w-0 overflow-x-auto rounded-lg pb-4" role="region" aria-label={t("Иерархия сотрудников")} tabIndex={0}><ul key={revision} aria-label={t("Организационная структура")} className="space-y-5 p-1">{(childrenByManager.get(null) ?? []).map((root) => <EmployeeBranch key={root.id} employee={root} childrenByManager={childrenByManager} depth={0} />)}</ul></div></>}
  </section>;
}
