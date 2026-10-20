"use client";
import { useAppFormat } from "../configuration-provider";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { getAuditTitle } from "@/lib/audit-presentation";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorPanel } from "@/components/ui/feedback";
import type { Result } from "@/types/shared";
import { getAuditLog } from "../actions";
import type { AuditEntry } from "../types";
import { SettingsNavigation } from "./settings-navigation";

/** Present the last hundred tenant events, with sanitized snapshots on demand. */
export function AuditWorkspace({ initial }: { initial: Result<AuditEntry[]> }) {
  const { formatDateTime } = useAppFormat();
  const { t, localeTag } = useI18n(), [result, setResult] = useState(initial), [loading, setLoading] = useState(false), [error, setError] = useState("");
  async function handleRefresh() { setLoading(true); setError(""); try { setResult(await getAuditLog()); } catch { setError(t("Audit log could not be loaded. Try again")); } finally { setLoading(false); } }
  const domains: Record<string, string> = { crm: "CRM", finance: "Finance", inventory: "Inventory", hr: "HR", projects: "Projects", settings: "Settings" };
  const actions: Record<string, string> = { created: "Created", updated: "Updated", deleted: "Deleted", payment: "Payment" };
  return <div className="space-y-6"><div className="motion flex flex-wrap items-start justify-between gap-4"><div><h1 className="page-title">{t("Audit log")}</h1><p className="muted mt-2 text-xs">{t("The latest 100 events in this workspace. Times follow the company timezone.")}</p></div><Button variant="outline" disabled={loading} onClick={handleRefresh}><RefreshCw className={loading ? "animate-spin" : ""} />{t("Refresh")}</Button></div><SettingsNavigation section="audit" admin />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{!result.ok ? <ErrorPanel error={result.error} /> : <section className="panel overflow-hidden" aria-busy={loading}>{!result.data.length ? <EmptyState title="No activity yet" description="Changes to workspace records and access will appear here." /> : <div className="overflow-x-auto"><table className="w-full min-w-[720px]"><thead><tr>{["Date", "Actor", "Module", "Action", "Record / changes"].map(label => <th className="table-heading" key={label}>{t(label)}</th>)}</tr></thead><tbody>{result.data.map(row => <tr key={row.id} className="border-t"><td className="table-cell whitespace-nowrap font-mono !text-[11px]">{formatDateTime(row.createdAt)}</td><td className="table-cell">{row.actor}</td><td className="table-cell">{t(domains[row.domain] ?? row.domain)}</td><td className="table-cell">{t(actions[row.action] ?? row.action)}</td><td className="table-cell max-w-md"><p className="break-words">{getAuditTitle(row, t)}</p><details className="mt-2"><summary className="cursor-pointer text-xs text-primary">{t("View changes")}</summary><div className="mt-3 grid gap-3"><div><p className="field-label">{t("Before")}</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md border p-3 text-[10px]">{JSON.stringify(row.before, null, 2)}</pre></div><div><p className="field-label">{t("After")}</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md border p-3 text-[10px]">{JSON.stringify(row.after, null, 2)}</pre></div></div></details></td></tr>)}</tbody></table></div>}</section>}</div>;
}
