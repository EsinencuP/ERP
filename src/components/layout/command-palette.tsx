"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, FileText, Plus } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { EmptyState } from "@/components/ui/feedback";
import { NAVIGATION_ITEMS } from "./navigation";
import { getCreateCommands } from "./workspace-commands";
import { useNewRecord } from "./new-record-provider";
import { canWrite, hasPermission } from "@/lib/permissions";
import { modules } from "@/lib/modules";
import { useI18n } from "@/i18n/use-i18n";
import type { SessionContext, WorkspaceState } from "@/types/shared";

const PAGES = [
  { href: "/crm/contacts", label: "Contacts" }, { href: "/crm/pipeline", label: "Deal pipeline" },
  { href: "/finance/dashboard", label: "Finance dashboard" }, { href: "/finance/payments", label: "Payments" },
  { href: "/finance/expenses", label: "Expenses" }, { href: "/finance/reports", label: "P&L report" },
  { href: "/inventory/dashboard", label: "Inventory dashboard" }, { href: "/inventory/warehouses", label: "Warehouses" },
  { href: "/hr/leaves", label: "Leave requests" }, { href: "/hr/org-chart", label: "Organization chart" },
  { href: "/projects/overview", label: "Projects overview" },
];

/** Search pages, permitted creation actions and the preserved document registry with cmdk. */
export default function CommandPalette({ open, onOpenChange, session, state }: { open: boolean; onOpenChange: (open: boolean) => void; session: SessionContext; state: WorkspaceState }) {
  const { t } = useI18n(), router = useRouter(), action = useNewRecord();
  const selection = useRef<(() => void) | null>(null);
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  useEffect(() => { if (open) setSearch(""); }, [open]);
  const documents = useMemo(() => {
    if (!query) return [];
    const matches: WorkspaceState["documents"] = [];
    for (const row of state.documents) {
      if (`${row.id} ${row.data.title} ${row.data.subtitle}`.toLowerCase().includes(query)) matches.push(row);
      if (matches.length === 8) break;
    }
    return matches;
  }, [state.documents, query]);
  function handleSelect(handleAction: () => void) { selection.current = handleAction; onOpenChange(false); }
  const pages = [...NAVIGATION_ITEMS, ...PAGES, ...(hasPermission(session.role, "canManageUsers") ? [{ href: "/settings/users", label: "Workspace members" }, { href: "/settings/audit", label: "Audit log" }] : [])];
  return <CommandDialog open={open} onOpenChange={onOpenChange} title="Command palette" description="Search pages and actions. Use arrow keys and Enter to select." contentProps={{ onCloseAutoFocus: function handleReturnFocus(event) {
    event.preventDefault();
    const run = selection.current; selection.current = null;
    document.getElementById("workspace-command-trigger")?.focus({ preventScroll: true });
    if (run) requestAnimationFrame(run);
  } }}>
    <CommandInput value={search} onValueChange={setSearch} aria-label={t("Search pages and actions")} placeholder={t("Search pages and actions…")} className="pr-12" />
    <CommandList aria-label={t("Commands")} className="max-h-[min(60dvh,420px)]">
      <CommandEmpty><EmptyState title="No matching commands" description="Try a module name or an action such as New invoice." /></CommandEmpty>
      {action && canWrite(session.role) && <CommandGroup heading={t("On this page")}><CommandItem disabled={!action.enabled} value={`current ${t(action.label)}`} keywords={[action.label]} onSelect={function handleCurrentAction() { handleSelect(action.run); }}><Plus />{t(action.label)}<CommandShortcut>⌘ / Ctrl N</CommandShortcut></CommandItem></CommandGroup>}
      <CommandGroup heading={t("Pages")}>{pages.map(item => <CommandItem key={item.href} value={`page ${t(item.label)} ${item.href}`} keywords={[item.label]} onSelect={function handlePage() { handleSelect(() => router.push(item.href)); }}><ArrowUpRight />{t(item.label)}</CommandItem>)}</CommandGroup>
      {getCreateCommands(session.role).length > 0 && <><CommandSeparator /><CommandGroup heading={t("Create")}>{getCreateCommands(session.role).map(item => <CommandItem key={item.href} value={`create ${t(item.label)}`} keywords={[item.label]} onSelect={function handleCreate() { handleSelect(() => router.push(`${item.href}?create=1`)); }}><Plus />{t(item.label)}</CommandItem>)}</CommandGroup></>}
      {documents.length > 0 && <><CommandSeparator /><CommandGroup heading={t("Document registry")}>{documents.map(row => <CommandItem key={row.id} value={`document ${row.id} ${row.data.title} ${row.data.subtitle}`} onSelect={function handleDocument() { handleSelect(() => router.push(`/${row.domain}${row.domain === "crm" ? "" : "/documents"}?q=${encodeURIComponent(row.data.title)}`)); }}><FileText /><span className="min-w-0 flex-1 truncate">{row.data.title}</span><span className="text-[10px] text-muted-foreground">{t(modules[row.domain].title)}</span></CommandItem>)}</CommandGroup></>}
    </CommandList>
    <p className="border-t px-4 py-3 text-[10px] text-muted-foreground">{t("↑ ↓ Navigate · Enter Select · Esc Close")}</p>
  </CommandDialog>;
}
