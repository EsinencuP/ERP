import { z } from "zod";
import { baseRecordSchema } from "@/lib/record-schema";
import { definition } from "./config";

export const schema = baseRecordSchema.extend({ status: z.enum(definition.statuses), subtitle: z.string().trim().min(1, "Заполните поле").max(160), email: z.string().email("Введите рабочий email") });
