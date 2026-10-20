import { z } from "zod";
import { FINANCE_CURRENCIES, invoiceMajorPriceSchema } from "@/modules/finance/schema";
import { taskIdSchema, taskSchema, taskProjectSchema } from "./task-schema";

export const PROJECT_STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;
const projectFields = taskProjectSchema.extend({ description: z.string().trim().max(4000).default(""), status: z.enum(PROJECT_STATUSES), budget: z.string().regex(/^\d{1,20}$/, "Бюджет: целые евроценты, до 20 цифр"), currency: z.enum(FINANCE_CURRENCIES), managerId: z.string().max(128).default(""), startDate: taskSchema.shape.dueDate, endDate: taskSchema.shape.dueDate });
const validPeriod = (value: { startDate?: string; endDate?: string }) => !value.startDate || !value.endDate || value.endDate >= value.startDate;
const periodMessage = { path: ["endDate"], message: "Окончание не раньше начала проекта" };
export const overviewProjectSchema = projectFields.refine(validPeriod, periodMessage);
export const overviewProjectFormSchema = projectFields.extend({ budget: invoiceMajorPriceSchema }).refine(validPeriod, periodMessage);
export const overviewFiltersSchema = z.object({ search: z.string().trim().max(200).default(""), status: z.enum(PROJECT_STATUSES).optional(), projectId: taskIdSchema.optional(), page: z.number().int().min(1).max(1000000).default(1) }).strict();
export const projectTeamFiltersSchema = z.object({ page: z.number().int().min(1).max(1000000).default(1) }).strict();
