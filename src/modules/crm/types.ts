import type { z } from "zod";
import type { schema } from "./schema";
import type { DocumentRecord } from "@/types/shared";

export type DealData = z.infer<typeof schema>;
export type Deal = Omit<DocumentRecord, "domain" | "data"> & { domain: "crm"; data: DealData };
