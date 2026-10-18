import { ErrorPanel } from "@/components/ui/feedback";
import { DealWorkspace } from "@/modules/crm/components/crm-workspace";
import { InvoiceWorkspace } from "@/modules/finance/components/finance-workspace";
import { ProductWorkspace } from "@/modules/inventory/components/inventory-workspace";
import { EmployeeWorkspace } from "@/modules/hr/components/hr-workspace";
import { ProjectWorkspace } from "@/modules/projects/components/projects-workspace";
import { getSession } from "@/lib/auth";
import { getWorkspaceState } from "@/lib/repository";
import type { Domain } from "@/types/shared";

const workspaces = { crm: DealWorkspace, finance: InvoiceWorkspace, inventory: ProductWorkspace, hr: EmployeeWorkspace, projects: ProjectWorkspace };

/** Load a domain only after tenant authentication; render failures through the shared Result view. */
export async function ModulePage({ domain }: { domain: Domain }) {
  const session = await getSession();
  if (!session.ok) return <ErrorPanel error={session.error} />;
  const state = await getWorkspaceState(session.data);
  if (!state.ok) return <ErrorPanel error={state.error} />;
  const Workspace = workspaces[domain];
  return <Workspace session={session.data} state={state.data} />;
}
