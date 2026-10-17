import "server-only";
import { getDocuments } from "@/lib/document-service";

/** Read crm documents within the authenticated workspace. */
export async function getDeals() { return getDocuments("crm"); }
