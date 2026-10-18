"use server";

import { revalidatePath } from "next/cache";
import type { DealStage } from "@prisma/client";
import { createDocument, deleteDocument, updateDocument, getDocuments } from "@/lib/document-service";
import type { Result } from "@/types/shared";
import * as service from "./service";
import * as queries from "./queries";
import type { ActivityFeedFilters, ContactFilters, ContactSelection, CreateActivityDTO, CreateContactDTO, CreateDealDTO, DealFilters, UpdateContactDTO } from "./types";

function revalidateCrm<T>(result: Result<T>): Result<T> {
  if (result.ok) {
    try { revalidatePath("/crm/contacts/[id]", "page"); revalidatePath("/crm/pipeline"); revalidatePath("/crm/contacts"); revalidatePath("/crm"); revalidatePath("/"); }
    catch { console.error("CRM cache revalidation failed after a committed mutation"); }
  }
  return result;
}
/** Read normalized contacts through the authenticated query boundary. */
export async function getContacts(filters: ContactFilters = {}) { return queries.getContacts(filters); }
/** Read one tenant-scoped contact with the first pages of its timeline and deals. */
export async function getContactDetail(id: string) { return queries.getContactDetail(id); }
/** Read a validated contact timeline page, including activities linked through its deals. */
export async function getContactActivities(id: string, filters: ActivityFeedFilters = {}) { return queries.getContactActivities(id, filters); }
/** Read a paginated list of deals after checking the parent contact still exists. */
export async function getContactDeals(id: string, page = 1) { return queries.getContactDeals(id, page); }
/** Read active assignee options only after server-side authorization. */
export async function getContactAssignees(search = "") { return queries.getContactAssignees(search); }
/** Recheck export permissions and fetch an exact bounded export scope. */
export async function getContactsForExport(filters: ContactFilters = {}, ids: string[] = []) { return queries.getContactsForExport(filters, ids); }
/** Delete a versioned contact selection atomically and invalidate CRM views. */
export async function deleteContacts(selection: ContactSelection[]) { return revalidateCrm(await service.deleteContacts(selection)); }
/** Reassign a versioned selection atomically to an active workspace member or null. */
export async function updateContactsAssignee(selection: ContactSelection[], ownerId: string | null) { return revalidateCrm(await service.updateContactsAssignee(selection, ownerId)); }
/** Read normalized deals through the authenticated query boundary. */
export async function getDeals(filters: DealFilters = {}) { return queries.getDeals(filters); }
/** Read paginated normalized Kanban columns for the current workspace. */
export async function getDealsByStage(filters: DealFilters = {}) { return queries.getDealsByStage(filters); }
/** Create a contact with authorization, atomic audit and cache invalidation. */
export async function createContact(input: CreateContactDTO) { return revalidateCrm(await service.createContact(input)); }
/** Update a contact at the supplied version and invalidate affected pages. */
export async function updateContact(id: string, version: number, input: UpdateContactDTO) { return revalidateCrm(await service.updateContact(id, version, input)); }
/** Delete an unreferenced contact at the supplied version. */
export async function deleteContact(id: string, version: number) { return revalidateCrm(await service.deleteContact(id, version)); }
/** Create a normalized deal and its audit event in one transaction. */
export async function createDeal(input: CreateDealDTO) { return revalidateCrm(await service.createDeal(input)); }
/** Change a normalized deal stage using optimistic concurrency. */
export async function updateDealStage(id: string, version: number, stage: DealStage) { return revalidateCrm(await service.updateDealStage(id, version, stage)); }
/** Create an activity linked to records in the authenticated workspace. */
export async function createActivity(input: CreateActivityDTO) { return revalidateCrm(await service.createActivity(input)); }

/** Read transitional Document records used by the existing CRM screen. */
export async function getDealDocuments() { return getDocuments("crm"); }
/** Preserve the current Document UI until its separate migration to Contact/Deal. */
export async function createDealDocument(input: unknown) { return revalidateCrm(await createDocument("crm", input)); }
/** Update a transitional Document with the existing tenant and version checks. */
export async function updateDealDocument(id: string, version: number, input: unknown) { return revalidateCrm(await updateDocument("crm", id, version, input)); }
/** Delete a transitional Document through the shared authorized service. */
export async function deleteDealDocument(id: string, version: number) { return revalidateCrm(await deleteDocument("crm", id, version)); }
