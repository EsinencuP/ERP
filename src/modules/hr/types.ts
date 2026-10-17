import type { z } from "zod";
import type { schema } from "./schema";
import type { DocumentRecord } from "@/types/shared";

export type EmployeeData = z.infer<typeof schema>;
export type Employee = Omit<DocumentRecord, "domain" | "data"> & { domain: "hr"; data: EmployeeData };
