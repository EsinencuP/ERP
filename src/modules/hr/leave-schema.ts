import { z } from "zod";
import { employeeIdSchema } from "./schema";
import { getLeaveDays } from "./leave-days";

export const leaveTypes = ["ANNUAL", "SICK", "UNPAID", "PARENTAL", "OTHER"] as const;
export const leaveStatuses = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
export const leaveSchema = z.object({ employeeId: employeeIdSchema, type: z.enum(leaveTypes), startDate: z.string(), endDate: z.string(), reason: z.string().trim().max(2000).default("") }).strict().superRefine((value, context) => { const days = getLeaveDays(value.startDate, value.endDate); if (!days.ok) context.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: days.error.message }); });
export const leaveDecisionSchema = z.enum(["APPROVED", "REJECTED"]);
export const leaveFiltersSchema = z.object({ page: z.number().int().min(1).max(1000000).default(1), pageSize: z.number().int().min(1).max(100).default(20), search: z.string().trim().max(200).default(""), employeeId: employeeIdSchema.optional(), status: z.enum(leaveStatuses).optional(), type: z.enum(leaveTypes).optional() }).strict();
