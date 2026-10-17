import "server-only";
import { createDocument, updateDocument, deleteDocument } from "@/lib/document-service";

/** Validate and create a projects record using the shared DocType service. */
export async function createProject(input: unknown) { return createDocument("projects", input); }
/** Update a projects record with optimistic version checking. */
export async function updateProject(id: string, version: number, input: unknown) { return updateDocument("projects", id, version, input); }
/** Delete an eligible projects record after authorization. */
export async function deleteProject(id: string, version: number) { return deleteDocument("projects", id, version); }
