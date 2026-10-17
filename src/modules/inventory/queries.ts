import "server-only";
import { getDocuments } from "@/lib/document-service";

/** Read inventory documents within the authenticated workspace. */
export async function getProducts() { return getDocuments("inventory"); }
