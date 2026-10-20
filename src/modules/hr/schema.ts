import { z } from "zod";
import { baseRecordSchema } from "@/lib/record-schema";
import { definition } from "./config";

export const schema = baseRecordSchema.extend({ status: z.enum(definition.statuses), subtitle: z.string().trim().min(1, "Заполните поле").max(160), email: z.string().email("Введите рабочий email") });

export const employeeStatuses = ["ACTIVE", "ON_LEAVE", "TERMINATED"] as const;
export const employeeIdSchema = z.string().trim().min(1).max(128);
export const employeeVersionSchema = z.number().int().positive().max(2_147_483_646);
export const employeeSchema = z.object({
  employeeId: z.string().trim().min(1, "Укажите табельный номер").max(64), name: z.string().trim().min(1, "Введите имя сотрудника").max(200),
  email: z.union([z.literal(""), z.string().email("Введите рабочий email").max(254)]).default(""), phone: z.string().trim().max(64).default(""),
  position: z.string().trim().max(200).default(""), department: z.string().trim().max(100).default(""),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дату приёма").refine((value) => value.slice(0, 4) !== "0000" && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, "Несуществующая дата"),
  status: z.enum(employeeStatuses).default("ACTIVE"), managerId: z.union([z.literal(""), employeeIdSchema]).default(""),
}).strict();
export const employeeFiltersSchema = z.object({ page: z.number().int().min(1).max(1000000).default(1), pageSize: z.number().int().min(1).max(100).default(20), search: z.string().trim().max(200).default(""), department: z.string().trim().max(100).optional(), status: z.enum(employeeStatuses).optional() }).strict();
