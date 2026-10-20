import { z } from "zod";

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const taskIdSchema = z.string().min(1).max(128);
export const taskVersionSchema = z.number().int().min(1).max(2147483646);
const dateSchema = z.string().refine((value) => { if (!value) return true; if (!/^(19|[2-9]\d)\d{2}-\d{2}-\d{2}$/.test(value)) return false; const date = new Date(`${value}T00:00:00Z`); return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value; }, "Укажите корректную дату от 1900 года");
export const taskSchema = z.object({ projectId: taskIdSchema.min(1, "Выберите проект"), title: z.string().trim().min(1, "Укажите название").max(200), description: z.string().trim().max(4000).default(""), status: z.enum(TASK_STATUSES), priority: z.enum(TASK_PRIORITIES), assignedToId: z.string().max(128).default(""), dueDate: dateSchema.default("") }).strict();
export const taskProjectSchema = z.object({ code: z.string().trim().min(1, "Укажите код").max(64), name: z.string().trim().min(1, "Укажите название").max(200) }).strict();
const page = z.number().int().min(1).max(1000000).default(1);
export const taskFiltersSchema = z.object({ search: z.string().trim().max(200).default(""), projectId: taskIdSchema.optional(), assignedToId: taskIdSchema.nullable().optional(), priority: z.enum(TASK_PRIORITIES).optional(), status: z.enum([...TASK_STATUSES, "CANCELLED"]).optional(), page, sort: z.object({ field: z.enum(["title", "status", "priority", "dueAt", "updatedAt"]), direction: z.enum(["asc", "desc"]) }).strict().default({ field: "updatedAt", direction: "desc" }), columnPages: z.object({ TODO: page, IN_PROGRESS: page, IN_REVIEW: page, DONE: page }).strict().default({ TODO: 1, IN_PROGRESS: 1, IN_REVIEW: 1, DONE: 1 }) }).strict();
export const taskOptionFiltersSchema = z.object({ search: z.string().trim().max(200).default(""), page }).strict();
