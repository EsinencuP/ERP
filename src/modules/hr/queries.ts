import "server-only";
import { getDocuments } from "@/lib/document-service";

/** Read hr documents within the authenticated workspace. */
export async function getEmployees() { return getDocuments("hr"); }
