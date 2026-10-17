import "server-only";
import { getDocuments } from "@/lib/document-service";

/** Read projects documents within the authenticated workspace. */
export async function getProjects() { return getDocuments("projects"); }
