import { z } from "zod";

export const USER_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "AGENT", "READONLY"] as const;
export const memberFiltersSchema = z.object({ search: z.string().trim().max(200).default(""), page: z.number().int().min(1).max(100000).default(1), role: z.enum(USER_ROLES).optional(), status: z.enum(["active", "inactive"]).optional() }).strict();
export const memberChangeSchema = z.object({ userId: z.string().min(1).max(128), version: z.number().int().positive().max(2147483646), role: z.enum(USER_ROLES), isActive: z.boolean() }).strict();
export const inviteSchema = z.object({ email: z.string().trim().email("Enter a valid email").max(200).transform((value) => value.toLowerCase()), role: z.enum(USER_ROLES) }).strict();
export const inviteVersionSchema = z.object({ id: z.string().min(1).max(128), version: z.number().int().positive().max(2147483646) }).strict();
export const invitationTokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const acceptInviteSchema = z.object({ token: invitationTokenSchema, name: z.string().trim().max(160).default(""), password: z.string().min(1, "Enter your password").max(200) }).strict();
