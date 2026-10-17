import type { z } from "zod";
import type { schema } from "./schema";
import type { DocumentRecord } from "@/types/shared";

export type InvoiceData = z.infer<typeof schema>;
export type Invoice = Omit<DocumentRecord, "domain" | "data"> & { domain: "finance"; data: InvoiceData };
