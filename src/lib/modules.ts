import { definition as crm } from "@/modules/crm/config";
import { definition as finance } from "@/modules/finance/config";
import { definition as inventory } from "@/modules/inventory/config";
import { definition as hr } from "@/modules/hr/config";
import { definition as projects } from "@/modules/projects/config";
import { schema as crmSchema } from "@/modules/crm/schema";
import { schema as financeSchema } from "@/modules/finance/schema";
import { schema as inventorySchema } from "@/modules/inventory/schema";
import { schema as hrSchema } from "@/modules/hr/schema";
import { schema as projectsSchema } from "@/modules/projects/schema";
import type { Domain, DomainDefinition, RecordData } from "@/types/shared";
import type { z } from "zod";

export const modules: Record<Domain, DomainDefinition> = { crm, finance, inventory, hr, projects };
export const schemas: Record<Domain, z.ZodType<RecordData, z.ZodTypeDef, unknown>> = { crm: crmSchema, finance: financeSchema, inventory: inventorySchema, hr: hrSchema, projects: projectsSchema };
