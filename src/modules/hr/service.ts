import "server-only";
import { createDocument, updateDocument, deleteDocument } from "@/lib/document-service";

/** Validate and create a hr record using the shared DocType service. */
export async function createEmployee(input: unknown) { return createDocument("hr", input); }
/** Update a hr record with optimistic version checking. */
export async function updateEmployee(id: string, version: number, input: unknown) { return updateDocument("hr", id, version, input); }
/** Delete an eligible hr record after authorization. */
export async function deleteEmployee(id: string, version: number) { return deleteDocument("hr", id, version); }
