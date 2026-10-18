import { z } from "zod";
import { baseRecordSchema } from "@/lib/record-schema";
import { definition } from "./config";

export const schema = baseRecordSchema.extend({ status: z.enum(definition.statuses), subtitle: z.string().trim().min(1, "Заполните поле").max(160) });

export const CONTACT_STAGES = ["LEAD", "PROSPECT", "CUSTOMER", "INACTIVE"] as const;
export const DEAL_STAGES = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;
export const ACTIVITY_TYPES = ["CALL", "EMAIL", "MEETING", "NOTE", "TASK"] as const;
export const entityIdSchema = z.string().trim().min(1).max(128);
export const versionSchema = z.number().int().positive().max(2_147_483_646);
export const contactSelectionSchema = z.array(z.object({ id: entityIdSchema, version: versionSchema }).strict()).min(1).max(100)
  .refine((rows) => new Set(rows.map((row) => row.id)).size === rows.length, "Контакты не должны повторяться");
export const contactExportIdsSchema = z.array(entityIdSchema).max(100)
  .refine((ids) => new Set(ids).size === ids.length, "Контакты не должны повторяться");
export const assigneeSearchSchema = z.string().trim().max(200);
const nullableText = (max: number) => z.string().trim().max(max).transform((value) => value || null).nullable().optional();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Используйте дату ГГГГ-ММ-ДД").refine((value) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Несуществующая дата");
const dateTimeSchema = z.string().datetime({ offset: true });
const minorUnitsSchema = z.union([z.string().regex(/^\d{1,20}$/, "Нужны целые копейки, максимум 20 цифр"), z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)]).transform((value) => BigInt(value).toString());
const currencySchema = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Укажите трёхбуквенный код валюты");
export const contactTagsSchema = z.array(z.string().trim().min(1, "Тег не должен быть пустым").max(32, "Тег — до 32 символов")).max(20, "Не более 20 тегов")
  .refine((tags) => new Set(tags.map((tag) => tag.toLocaleLowerCase("ru"))).size === tags.length, "Теги не должны повторяться");

/** Normalized Contact input; tenant, IDs, timestamps and versions are server-owned. */
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Введите имя контакта").max(160),
  company: nullableText(200),
  email: z.union([z.string().trim().email("Введите корректный email").max(200), z.literal("")]).transform((value) => value ? value.toLowerCase() : null).nullable().optional(),
  phone: nullableText(64), address: nullableText(1000), notes: nullableText(10_000),
  stage: z.enum(CONTACT_STAGES).default("LEAD"), ownerId: entityIdSchema.nullable().optional(),
  tags: contactTagsSchema.default([]),
}).strict();

export const updateContactSchema = contactSchema.partial().refine((value) => Object.values(value).some((field) => field !== undefined), "Укажите изменяемое поле");

/** Exact integer minor units remain strings after parsing, including beyond MAX_SAFE_INTEGER. */
export const dealSchema = z.object({
  title: z.string().trim().min(1, "Введите название сделки").max(240),
  contactId: entityIdSchema, ownerId: entityIdSchema.nullable().optional(),
  stage: z.enum(DEAL_STAGES).default("NEW"), value: minorUnitsSchema.default("0"),
  currency: currencySchema.default("RUB"), expectedCloseDate: dateSchema.nullable().optional(), notes: nullableText(10_000),
}).strict();

/** An activity must belong to a contact, a deal, or a consistent pair of both. */
export const activitySchema = z.object({
  subject: z.string().trim().min(1, "Введите тему активности").max(240), type: z.enum(ACTIVITY_TYPES),
  contactId: entityIdSchema.nullable().optional(), dealId: entityIdSchema.nullable().optional(),
  assignedToId: entityIdSchema.nullable().optional(), description: nullableText(10_000), dueAt: dateTimeSchema.nullable().optional(),
}).strict().refine((value) => Boolean(value.contactId || value.dealId), "Выберите контакт или сделку");

export const activityComposerSchema = activitySchema.innerType().pick({ type: true, subject: true, description: true });
export const contactEditSchema = contactSchema.pick({ name: true, company: true, email: true, phone: true, address: true, notes: true });
export const contactFormSchema = contactEditSchema.extend({ stage: contactSchema.shape.stage });
export const activityFeedFiltersSchema = z.object({ page: z.number().int().min(1).max(1_000_000).default(1), pageSize: z.number().int().min(1).max(50).default(20), type: z.enum(ACTIVITY_TYPES).optional() }).strict();

const paginationShape = { page: z.number().int().min(1).max(1_000_000).default(1), pageSize: z.number().int().min(1).max(100).default(20), search: z.string().trim().max(200).optional() };
const directionSchema = z.enum(["asc", "desc"]).default("desc");
export const contactFiltersSchema = z.object({
  ...paginationShape, stage: z.enum(CONTACT_STAGES).optional(), ownerId: entityIdSchema.nullable().optional(),
  sort: z.object({ field: z.enum(["createdAt", "updatedAt", "name", "company", "email", "stage"]), direction: directionSchema }).strict().default({ field: "createdAt", direction: "desc" }),
}).strict();
export const dealFiltersSchema = z.object({
  ...paginationShape, stage: z.enum(DEAL_STAGES).optional(), contactId: entityIdSchema.optional(), ownerId: entityIdSchema.nullable().optional(),
  currency: currencySchema.optional(), minValue: minorUnitsSchema.optional(), maxValue: minorUnitsSchema.optional(),
  expectedCloseFrom: dateSchema.optional(), expectedCloseTo: dateSchema.optional(),
  sort: z.object({ field: z.enum(["createdAt", "updatedAt", "title", "value", "stage", "expectedCloseDate"]), direction: directionSchema }).strict().default({ field: "createdAt", direction: "desc" }),
}).strict().refine((value) => value.minValue === undefined || value.maxValue === undefined || BigInt(value.minValue) <= BigInt(value.maxValue), "Минимальная сумма превышает максимальную")
  .refine((value) => !value.expectedCloseFrom || !value.expectedCloseTo || value.expectedCloseFrom <= value.expectedCloseTo, "Неверный диапазон дат");
