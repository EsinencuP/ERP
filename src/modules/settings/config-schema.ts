import { z } from "zod";
export const DATE_FORMATS = ["yyyy-MM-dd", "dd.MM.yyyy", "MM/dd/yyyy", "MMM d, yyyy"] as const;
export const NOTIFICATION_EVENTS = ["created", "updated", "deleted", "payment"] as const;
export const notificationSchema = z.object({ created: z.boolean(), updated: z.boolean(), deleted: z.boolean(), payment: z.boolean() }).strict();
export const DEFAULT_NOTIFICATIONS = { created: true, updated: true, deleted: true, payment: true };
/** Validate a recognized IANA zone without assuming the browser or server's local timezone. */
export function isTimezone(value: string): boolean { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }
export const appConfigSchema = z.object({ companyName: z.string().trim().min(2).max(160), logo: z.string().max(350000).regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/).nullable(), currency: z.literal("EUR"), timezone: z.string().trim().min(1).max(100).refine(isTimezone, "Enter a valid IANA timezone"), dateFormat: z.enum(DATE_FORMATS), notifications: notificationSchema }).strict();
export const configChangeSchema = appConfigSchema.extend({ version: z.number().int().min(0).max(2147483646) }).strict();
export type AppConfiguration = z.infer<typeof appConfigSchema> & { version: number };
export type ConfigChange = z.input<typeof configChangeSchema>;
/** Return documented initial values only for a genuinely unconfigured or explicit demo workspace. */
export function defaultConfiguration(companyName: string): AppConfiguration { return { companyName, logo: null, currency: "EUR", timezone: "Europe/Moscow", dateFormat: "yyyy-MM-dd", notifications: { ...DEFAULT_NOTIFICATIONS }, version: 0 }; }
