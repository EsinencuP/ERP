import type { z } from "zod";
import type { Contact as DbContact, Deal as DbDeal, Activity as DbActivity, DealStage } from "@prisma/client";
import type { schema, contactSchema, updateContactSchema, dealSchema, activitySchema, contactFiltersSchema, dealFiltersSchema, activityFeedFiltersSchema } from "./schema";
import type { DocumentRecord, PaginatedResponse } from "@/types/shared";

export type DealData = z.infer<typeof schema>;
export type DealDocument = Omit<DocumentRecord, "domain" | "data"> & { domain: "crm"; data: DealData };
export type CreateContactDTO = z.input<typeof contactSchema>;
export type UpdateContactDTO = z.input<typeof updateContactSchema>;
export type CreateDealDTO = z.input<typeof dealSchema>;
export type CreateActivityDTO = z.input<typeof activitySchema>;
export type ContactFilters = z.input<typeof contactFiltersSchema>;
export type DealFilters = z.input<typeof dealFiltersSchema>;
/** Wire types contain ISO dates and exact Decimal strings, never Prisma instances. */
export type Contact = Omit<DbContact, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string };
export type ContactAssignee = { id: string; name: string; avatar: string | null };
export type ContactTableRow = Contact & { owner: ContactAssignee | null };
export type ContactSelection = { id: string; version: number };
export type Deal = Omit<DbDeal, "value" | "createdAt" | "updatedAt" | "expectedCloseDate" | "closedAt"> & {
  value: string; createdAt: string; updatedAt: string; expectedCloseDate: string | null; closedAt: string | null;
  contact: Pick<Contact, "id" | "name" | "company">;
};
export type Activity = Omit<DbActivity, "createdAt" | "updatedAt" | "dueAt" | "completedAt"> & { createdAt: string; updatedAt: string; dueAt: string | null; completedAt: string | null };
/** Every Kanban column has a bounded, independently counted page. */
export type DealsByStage = Record<DealStage, PaginatedResponse<Deal>>;
/** Extra bounded summaries for the pipeline; dates and money remain wire-safe. */
export type PipelineDeal = Deal & { owner: ContactAssignee | null; lastActivity: Pick<Activity, "id" | "subject" | "type" | "createdAt"> | null };
export type DealPipelineByStage = Record<DealStage, PaginatedResponse<PipelineDeal>>;
export type ActivityFeedFilters = z.input<typeof activityFeedFiltersSchema>;
export type ContactActivity = Activity & { assignee: ContactAssignee | null; deal: Pick<Deal, "id" | "title" | "stage"> | null };
export type ContactDetail = { contact: ContactTableRow; activities: PaginatedResponse<ContactActivity>; deals: PaginatedResponse<Deal> };
