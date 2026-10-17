import "server-only";
import { createDocument, updateDocument, deleteDocument } from "@/lib/document-service";

/** Validate and create a inventory record using the shared DocType service. */
export async function createProduct(input: unknown) { return createDocument("inventory", input); }
/** Update a inventory record with optimistic version checking. */
export async function updateProduct(id: string, version: number, input: unknown) { return updateDocument("inventory", id, version, input); }
/** Delete an eligible inventory record after authorization. */
export async function deleteProduct(id: string, version: number) { return deleteDocument("inventory", id, version); }
