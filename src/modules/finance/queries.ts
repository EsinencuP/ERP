import "server-only";
import { getDocuments } from "@/lib/document-service";

/** Read finance documents within the authenticated workspace. */
export async function getInvoices() { return getDocuments("finance"); }
