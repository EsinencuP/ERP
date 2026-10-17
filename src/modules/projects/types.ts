import type { z } from "zod";
import type { schema } from "./schema";
import type { DocumentRecord } from "@/types/shared";

export type ProjectData = z.infer<typeof schema>;
export type Project = Omit<DocumentRecord, "domain" | "data"> & { domain: "projects"; data: ProjectData };
