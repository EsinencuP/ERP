import { z } from "zod";

export const domainSchema = z.enum(["crm", "finance", "inventory", "hr", "projects"]);
export const baseRecordSchema = z.object({
  title: z.string().trim().min(2, "Введите минимум 2 символа").max(160, "Не более 160 символов"),
  subtitle: z.string().trim().max(160).default(""),
  status: z.string().min(1, "Выберите статус"),
  amount: z.number().int("Сумма должна быть в евроцентах").min(0).max(1_000_000_000_000).default(0),
  quantity: z.number().int().min(0).max(1_000_000_000).default(0),
  email: z.union([z.literal(""), z.string().email("Проверьте email")]).default(""),
  date: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Используйте дату ГГГГ-ММ-ДД").refine((value) => { const date = new Date(value); return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value; }, "Несуществующая дата")]).default(""),
  progress: z.number().int().min(0).max(100).default(0),
  notes: z.string().trim().max(2000).default(""),
}).strict();
export const defaultRecord = { title: "", subtitle: "", status: "", amount: 0, quantity: 0, email: "", date: "", progress: 0, notes: "" };
