import { z } from "zod";
import { baseRecordSchema } from "@/lib/record-schema";
import { definition } from "./config";

export const schema = baseRecordSchema.extend({ status: z.enum(definition.statuses), subtitle: z.string().trim().min(1, "Заполните поле").max(160), amount: z.number().int().positive("Сумма должна быть больше нуля"), date: baseRecordSchema.shape.date.refine((value) => value.length > 0, "Укажите срок оплаты") });
