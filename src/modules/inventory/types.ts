import type { z } from "zod";
import type { schema } from "./schema";
import type { DocumentRecord } from "@/types/shared";

export type ProductData = z.infer<typeof schema>;
export type Product = Omit<DocumentRecord, "domain" | "data"> & { domain: "inventory"; data: ProductData };
