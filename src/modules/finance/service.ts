import "server-only";
import { createDocument, updateDocument, deleteDocument } from "@/lib/document-service";

/** Validate and create a finance record using the shared DocType service. */
export async function createInvoice(input: unknown) { return createDocument("finance", input); }
/** Update a finance record with optimistic version checking. */
export async function updateInvoice(id: string, version: number, input: unknown) { return updateDocument("finance", id, version, input); }
/** Delete an eligible finance record after authorization. */
export async function deleteInvoice(id: string, version: number) { return deleteDocument("finance", id, version); }
