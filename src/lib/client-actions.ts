import * as crm from "@/modules/crm/actions";
import * as finance from "@/modules/finance/actions";
import * as inventory from "@/modules/inventory/actions";
import * as hr from "@/modules/hr/actions";
import * as projects from "@/modules/projects/actions";
import type { DocumentRecord, Domain, Result } from "@/types/shared";

type ModuleActions = { create: (input: unknown) => Promise<Result<DocumentRecord>>; update: (id: string, version: number, input: unknown) => Promise<Result<DocumentRecord>>; delete: (id: string, version: number) => Promise<Result<DocumentRecord>> };
export const actions: Record<Domain, ModuleActions> = {
  crm: { create: crm.createDealDocument, update: crm.updateDealDocument, delete: crm.deleteDealDocument },
  finance: { create: finance.createInvoiceDocument, update: finance.updateInvoiceDocument, delete: finance.deleteInvoiceDocument },
  inventory: { create: inventory.createProductDocument, update: inventory.updateProductDocument, delete: inventory.deleteProductDocument },
  hr: { create: hr.createEmployee, update: hr.updateEmployee, delete: hr.deleteEmployee },
  projects: { create: projects.createProject, update: projects.updateProject, delete: projects.deleteProject },
};
