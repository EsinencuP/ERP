import { z } from "zod";

export const leaveYearSchema = z.number().int().min(1900).max(9999);
export const employeeProfileFiltersSchema = z.object({ year: leaveYearSchema.optional(), documentsPage: z.number().int().min(1).max(1000000).default(1) }).strict();
const documentUrlSchema = z.string().trim().max(2048).refine((value) => { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password && url.href.length <= 2048; } catch { return false; } }, "Укажите http(s)-ссылку без логина и пароля").transform((value) => new URL(value).href);
export const employeeDocumentLinkSchema = z.object({ title: z.string().trim().min(1, "Укажите название").max(200), url: documentUrlSchema, notes: z.string().trim().max(2000).default("") }).strict();
export const leaveAllowanceSchema = z.object({ year: leaveYearSchema, days: z.string().regex(/^\d{1,4}$/, "Лимит: целое число рабочих дней от 0 до 9999") }).strict();

/** Revalidate a stored document reference before rendering a user-activated external link. */
export function getEmployeeDocumentUrl(value: string): string | null { const parsed = documentUrlSchema.safeParse(value); return parsed.success ? parsed.data : null; }
/** Determine the default leave year from Moscow's calendar, independently of server/browser timezone. */
export function getCurrentLeaveYear(): number { return Number(new Intl.DateTimeFormat("en", { timeZone: "Europe/Moscow", year: "numeric" }).format(new Date())); }
