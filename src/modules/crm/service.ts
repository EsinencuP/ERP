import "server-only";
import { createDocument, updateDocument, deleteDocument } from "@/lib/document-service";

/** Validate and create a crm record using the shared DocType service. */
export async function createDeal(input: unknown) { return createDocument("crm", input); }
/** Update a crm record with optimistic version checking. */
export async function updateDeal(id: string, version: number, input: unknown) { return updateDocument("crm", id, version, input); }
/** Delete an eligible crm record after authorization. */
export async function deleteDeal(id: string, version: number) { return deleteDocument("crm", id, version); }
