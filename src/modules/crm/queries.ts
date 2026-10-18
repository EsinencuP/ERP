import "server-only";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import { hasPermission } from "@/lib/permissions";
import type { PaginatedResponse, Result } from "@/types/shared";
import { getCrmContext } from "./access";
import { getCrmStorageError } from "./errors";
import { activityFeedFiltersSchema, assigneeSearchSchema, contactExportIdsSchema, contactFiltersSchema, dealFiltersSchema, entityIdSchema, DEAL_STAGES } from "./schema";
import { contactActivityInclude, contactOwnerInclude, dealContactInclude, dealPipelineInclude, toContactActivity, toContactTableRow, toDeal, toPipelineDeal } from "./serializers";
import type { ActivityFeedFilters, ContactActivity, ContactAssignee, ContactDetail, ContactTableRow, ContactFilters, Deal, DealFilters, DealPipelineByStage } from "./types";

function paginate<T>(data: T[], total: number, page: number, pageSize: number): PaginatedResponse<T> {
  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

async function readActivityPage(tx: Prisma.TransactionClient, workspaceId: string, contactId: string, filters: z.output<typeof activityFeedFiltersSchema>): Promise<PaginatedResponse<ContactActivity>> {
  const where: Prisma.ActivityWhereInput = { workspaceId, OR: [{ contactId }, { contactId: null, deal: { workspaceId, contactId } }], ...(filters.type === undefined ? {} : { type: filters.type }) };
  const rows = await tx.activity.findMany({ where, include: contactActivityInclude, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize });
  const total = await tx.activity.count({ where });
  return paginate(rows.map(toContactActivity), total, filters.page, filters.pageSize);
}

async function readContactDeals(tx: Prisma.TransactionClient, workspaceId: string, contactId: string, page: number): Promise<PaginatedResponse<Deal>> {
  const pageSize = 5;
  const where = { workspaceId, contactId };
  const rows = await tx.deal.findMany({ where, include: dealContactInclude, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize });
  return paginate(rows.map(toDeal), await tx.deal.count({ where }), page, pageSize);
}

/** Read a contact, initial activity page and deal page from the same authenticated snapshot. */
export async function getContactDetail(id: string): Promise<Result<ContactDetail>> {
  const context = await getCrmContext();
  if (!context.ok) return context;
  const parsed = entityIdSchema.safeParse(id);
  if (!parsed.success) return err("VALIDATION", "Неверный идентификатор контакта");
  try {
    return await db.$transaction(async (tx) => {
      const row = await tx.contact.findUnique({ where: { id_workspaceId: { id: parsed.data, workspaceId: context.data.workspaceId } }, include: contactOwnerInclude });
      if (!row) return err("NOT_FOUND", "Контакт не найден");
      const activities = await readActivityPage(tx, context.data.workspaceId, row.id, { page: 1, pageSize: 20 });
      const deals = await readContactDeals(tx, context.data.workspaceId, row.id, 1);
      return ok({ contact: toContactTableRow(row), activities, deals });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  } catch (error: unknown) { return getCrmStorageError(error); }
}

/** Read a bounded, type-filtered timeline only after verifying the parent contact. */
export async function getContactActivities(id: string, filters: ActivityFeedFilters = {}): Promise<Result<PaginatedResponse<ContactActivity>>> {
  const context = await getCrmContext();
  if (!context.ok) return context;
  const parsedId = entityIdSchema.safeParse(id);
  const parsed = activityFeedFiltersSchema.safeParse(filters);
  if (!parsedId.success || !parsed.success) return err("VALIDATION", "Неверные параметры ленты активностей");
  try {
    return await db.$transaction(async (tx) => {
      const contact = await tx.contact.findUnique({ where: { id_workspaceId: { id: parsedId.data, workspaceId: context.data.workspaceId } }, select: { id: true } });
      if (!contact) return err("NOT_FOUND", "Контакт не найден");
      return ok(await readActivityPage(tx, context.data.workspaceId, contact.id, parsed.data));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  } catch (error: unknown) { return getCrmStorageError(error); }
}

/** Read more related deals without revealing whether another tenant owns the supplied contact ID. */
export async function getContactDeals(id: string, page = 1): Promise<Result<PaginatedResponse<Deal>>> {
  const context = await getCrmContext();
  if (!context.ok) return context;
  const parsedId = entityIdSchema.safeParse(id);
  const parsed = activityFeedFiltersSchema.safeParse({ page });
  if (!parsedId.success || !parsed.success) return err("VALIDATION", "Неверная страница сделок контакта");
  try {
    return await db.$transaction(async (tx) => {
      const contact = await tx.contact.findUnique({ where: { id_workspaceId: { id: parsedId.data, workspaceId: context.data.workspaceId } }, select: { id: true } });
      if (!contact) return err("NOT_FOUND", "Контакт не найден");
      return ok(await readContactDeals(tx, context.data.workspaceId, contact.id, parsed.data.page));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  } catch (error: unknown) { return getCrmStorageError(error); }
}
function contactWhere(workspaceId: string, filters: z.output<typeof contactFiltersSchema>): Prisma.ContactWhereInput {
  return { workspaceId, ...(filters.stage === undefined ? {} : { stage: filters.stage }), ...(filters.ownerId === undefined ? {} : { ownerId: filters.ownerId }), ...(!filters.search ? {} : { OR: ["name", "company", "email", "phone"].map((field) => ({ [field]: { contains: filters.search, mode: "insensitive" } })) }) };
}
function dealWhere(workspaceId: string, filters: z.output<typeof dealFiltersSchema>): Prisma.DealWhereInput {
  return { workspaceId,
    ...(filters.stage === undefined ? {} : { stage: filters.stage }),
    ...(filters.contactId === undefined ? {} : { contactId: filters.contactId }),
    ...(filters.ownerId === undefined ? {} : { ownerId: filters.ownerId }),
    ...(filters.currency === undefined ? {} : { currency: filters.currency }),
    ...(filters.minValue === undefined && filters.maxValue === undefined ? {} : { value: { ...(filters.minValue === undefined ? {} : { gte: new Prisma.Decimal(filters.minValue) }), ...(filters.maxValue === undefined ? {} : { lte: new Prisma.Decimal(filters.maxValue) }) } }),
    ...(!filters.expectedCloseFrom && !filters.expectedCloseTo ? {} : { expectedCloseDate: { ...(filters.expectedCloseFrom ? { gte: new Date(filters.expectedCloseFrom) } : {}), ...(filters.expectedCloseTo ? { lte: new Date(filters.expectedCloseTo) } : {}) } }),
    ...(!filters.search ? {} : { OR: [{ title: { contains: filters.search, mode: "insensitive" } }, { notes: { contains: filters.search, mode: "insensitive" } }, { contact: { name: { contains: filters.search, mode: "insensitive" } } }, { contact: { company: { contains: filters.search, mode: "insensitive" } } }] }),
  };
}
/** Read a stable contact page and count from one authenticated tenant snapshot. */
export async function getContacts(filters: ContactFilters = {}): Promise<Result<PaginatedResponse<ContactTableRow>>> {
  const context = await getCrmContext();
  if (!context.ok) return context;
  const parsed = contactFiltersSchema.safeParse(filters);
  if (!parsed.success) return err("VALIDATION", "Неверные фильтры контактов", { fields: parsed.error.flatten() });
  const data = parsed.data;
  const where = contactWhere(context.data.workspaceId, data);
  try {
    const [rows, total] = await db.$transaction([
      db.contact.findMany({ where, include: contactOwnerInclude, orderBy: [{ [data.sort.field]: data.sort.direction }, { id: "asc" }], skip: (data.page - 1) * data.pageSize, take: data.pageSize }), db.contact.count({ where }),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return ok(paginate(rows.map(toContactTableRow), total, data.page, data.pageSize));
  } catch (error: unknown) { return getCrmStorageError(error); }
}

/** Search at most 50 active workspace assignees; the query never returns authentication data. */
export async function getContactAssignees(search = ""): Promise<Result<ContactAssignee[]>> {
  const context = await getCrmContext("update");
  if (!context.ok) return context;
  const parsed = assigneeSearchSchema.safeParse(search);
  if (!parsed.success) return err("VALIDATION", "Неверный поиск участников");
  try {
    const members = await db.membership.findMany({ where: { workspaceId: context.data.workspaceId, isActive: true, user: { isActive: true, ...(parsed.data ? { OR: [{ name: { contains: parsed.data, mode: "insensitive" } }, { email: { contains: parsed.data, mode: "insensitive" } }] } : {}) } }, select: { user: { select: { id: true, name: true, avatar: true } } }, orderBy: [{ user: { name: "asc" } }, { userId: "asc" }], take: 50 });
    return ok(members.map((member) => member.user));
  } catch (error: unknown) { return getCrmStorageError(error); }
}

/** Export selected IDs or the complete filtered set, with server RBAC and an explicit size limit. */
export async function getContactsForExport(filters: ContactFilters = {}, ids: string[] = []): Promise<Result<ContactTableRow[]>> {
  const context = await getCrmContext();
  if (!context.ok) return context;
  if (!hasPermission(context.data.role, "canExport")) return err("FORBIDDEN", "Экспорт доступен менеджерам и администраторам");
  const parsed = contactFiltersSchema.safeParse(filters);
  const selected = contactExportIdsSchema.safeParse(ids);
  if (!parsed.success || !selected.success) return err("VALIDATION", "Неверные параметры экспорта");
  const data = parsed.data;
  try {
    const rows = await db.contact.findMany({ where: { ...contactWhere(context.data.workspaceId, data), ...(selected.data.length ? { id: { in: selected.data } } : {}) }, include: contactOwnerInclude, orderBy: [{ [data.sort.field]: data.sort.direction }, { id: "asc" }], take: 5001 });
    if (selected.data.length && rows.length !== selected.data.length) return err("NOT_FOUND", "Один из выбранных контактов больше недоступен. Обновите таблицу");
    if (rows.length > 5000) return err("VALIDATION", "Экспорт ограничен 5000 контактами. Уточните фильтр или выберите записи");
    return ok(rows.map(toContactTableRow));
  } catch (error: unknown) { return getCrmStorageError(error); }
}
/** Read deals with bounded pagination, exact amount filters and scoped contact summaries. */
export async function getDeals(filters: DealFilters = {}): Promise<Result<PaginatedResponse<Deal>>> {
  const context = await getCrmContext();
  if (!context.ok) return context;
  const parsed = dealFiltersSchema.safeParse(filters);
  if (!parsed.success) return err("VALIDATION", "Неверные фильтры сделок", { fields: parsed.error.flatten() });
  const data = parsed.data;
  const where = dealWhere(context.data.workspaceId, data);
  try {
    const [rows, total] = await db.$transaction([
      db.deal.findMany({ where, include: dealContactInclude, orderBy: [{ [data.sort.field]: data.sort.direction }, { id: "asc" }], skip: (data.page - 1) * data.pageSize, take: data.pageSize }), db.deal.count({ where }),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return ok(paginate(rows.map(toDeal), total, data.page, data.pageSize));
  } catch (error: unknown) { return getCrmStorageError(error); }
}
/** Return every Kanban column with its own bounded page and filtered count. */
export async function getDealsByStage(filters: DealFilters = {}): Promise<Result<DealPipelineByStage>> {
  const context = await getCrmContext();
  if (!context.ok) return context;
  const parsed = dealFiltersSchema.safeParse(filters);
  if (!parsed.success) return err("VALIDATION", "Неверные фильтры Kanban", { fields: parsed.error.flatten() });
  const data = parsed.data;
  const where = dealWhere(context.data.workspaceId, data);
  try {
    return await db.$transaction(async (tx) => {
      const counts = await tx.deal.groupBy({ by: ["stage"], where, _count: { _all: true } });
      const columns = {} as DealPipelineByStage;
      for (const stage of DEAL_STAGES) {
        const total = counts.find((count) => count.stage === stage)?._count._all ?? 0;
        const rows = total === 0 ? [] : await tx.deal.findMany({ where: { AND: [where, { stage }] }, include: { ...dealPipelineInclude, activities: { ...dealPipelineInclude.activities, where: { workspaceId: context.data.workspaceId } } }, orderBy: [{ [data.sort.field]: data.sort.direction }, { id: "asc" }], skip: (data.page - 1) * data.pageSize, take: data.pageSize });
        columns[stage] = paginate(rows.map(toPipelineDeal), total, data.page, data.pageSize);
      }
      return ok(columns);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  } catch (error: unknown) { return getCrmStorageError(error); }
}
