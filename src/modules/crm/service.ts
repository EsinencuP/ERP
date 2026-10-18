import "server-only";
import { Prisma, type DealStage } from "@prisma/client";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import type { Result, SessionContext } from "@/types/shared";
import { getCrmContext } from "./access";
import { getCrmStorageError } from "./errors";
import { activitySchema, contactSchema, contactSelectionSchema, dealSchema, entityIdSchema, updateContactSchema, versionSchema, DEAL_STAGES } from "./schema";
import { dealContactInclude, toActivity, toContact, toDeal } from "./serializers";
import type { Activity, Contact, ContactSelection, CreateActivityDTO, CreateContactDTO, CreateDealDTO, Deal, UpdateContactDTO } from "./types";

type Transaction = Prisma.TransactionClient;
async function withMutation<T>(operation: "create" | "update" | "delete", handleMutation: (tx: Transaction, session: SessionContext) => Promise<Result<T>>): Promise<Result<T>> {
  const context = await getCrmContext(operation);
  if (!context.ok) return context;
  try { return await db.$transaction((tx) => handleMutation(tx, context.data), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 }); }
  catch (error: unknown) { return getCrmStorageError(error); }
}

async function getSelectedContacts(tx: Transaction, workspaceId: string, selection: ContactSelection[]): Promise<Result<Contact[]>> {
  const parsed = contactSelectionSchema.safeParse(selection);
  if (!parsed.success) return err("VALIDATION", "Выберите от 1 до 100 разных контактов с актуальными версиями");
  const rows = await tx.contact.findMany({ where: { workspaceId, id: { in: parsed.data.map((row) => row.id) } }, orderBy: { id: "asc" } });
  if (rows.length !== parsed.data.length) return err("NOT_FOUND", "Один из контактов больше недоступен. Обновите таблицу");
  const versions = new Map(parsed.data.map((row) => [row.id, row.version]));
  if (rows.some((row) => row.version !== versions.get(row.id))) return err("CONFLICT", "Выбранные контакты уже изменились. Обновите таблицу и выберите их заново");
  return ok(rows.map(toContact));
}

/** Delete the whole selection or roll back every deletion and audit on any conflict. */
export async function deleteContacts(selection: ContactSelection[]): Promise<Result<Contact[]>> {
  return withMutation("delete", async (tx, session) => {
    const selected = await getSelectedContacts(tx, session.workspaceId, selection);
    if (!selected.ok) return selected;
    const dependent = await tx.contact.findFirst({ where: { workspaceId: session.workspaceId, id: { in: selected.data.map((row) => row.id) }, OR: [{ deals: { some: {} } }, { activities: { some: {} } }, { invoices: { some: {} } }, { projects: { some: {} } }] }, select: { id: true } });
    if (dependent) return err("CONFLICT", "В выборке есть контакты со связанными документами. Уберите их из выбора; ничего не удалено");
    for (const contact of selected.data) {
      await tx.contact.delete({ where: { id_workspaceId: { id: contact.id, workspaceId: session.workspaceId }, version: contact.version } });
      await createAudit(tx, session, "deleted", "Contact", contact.id, contact.name, contact, null);
    }
    return selected;
  });
}

/** Reassign the complete versioned selection and append one audit snapshot per contact. */
export async function updateContactsAssignee(selection: ContactSelection[], ownerId: string | null): Promise<Result<Contact[]>> {
  return withMutation("update", async (tx, session) => {
    const owner = entityIdSchema.nullable().safeParse(ownerId);
    if (!owner.success) return err("VALIDATION", "Выберите ответственного или снимите назначение");
    const selected = await getSelectedContacts(tx, session.workspaceId, selection);
    if (!selected.ok) return selected;
    const member = await validateMember(tx, session.workspaceId, owner.data);
    if (!member.ok) return member;
    const updated: Contact[] = [];
    for (const before of selected.data) {
      const contact = toContact(await tx.contact.update({ where: { id_workspaceId: { id: before.id, workspaceId: session.workspaceId }, version: before.version }, data: { ownerId: owner.data, version: { increment: 1 } } }));
      await createAudit(tx, session, "updated", "Contact", contact.id, contact.name, before, contact);
      updated.push(contact);
    }
    return ok(updated);
  });
}
async function validateMember(tx: Transaction, workspaceId: string, userId: string | null): Promise<Result<null>> {
  if (userId === null) return ok(null);
  const member = await tx.membership.findFirst({ where: { workspaceId, userId, isActive: true, user: { isActive: true } }, select: { userId: true } });
  return member ? ok(null) : err("VALIDATION", "Ответственный должен быть активным участником текущего workspace");
}
async function createAudit(tx: Transaction, session: SessionContext, action: string, entityType: string, entityId: string, title: string, before: Prisma.InputJsonObject | null, after: Prisma.InputJsonObject | null): Promise<void> {
  await tx.auditLog.create({ data: { workspaceId: session.workspaceId, actor: session.name, actorId: session.userId, domain: "crm", action, entityType, entityId, title, before: before ?? Prisma.DbNull, after: after ?? Prisma.DbNull } });
}
function validateIdentity(id: string, version: number): Result<null> {
  return entityIdSchema.safeParse(id).success && versionSchema.safeParse(version).success ? ok(null) : err("VALIDATION", "Нужны идентификатор и положительная целая версия записи");
}

/** Create a tenant-scoped contact and its audit snapshot in one transaction. */
export async function createContact(input: CreateContactDTO): Promise<Result<Contact>> {
  return withMutation("create", async (tx, session) => {
    const parsed = contactSchema.safeParse(input);
    if (!parsed.success) return err("VALIDATION", "Проверьте поля контакта", { fields: parsed.error.flatten() });
    const data = parsed.data;
    const ownerId = data.ownerId === undefined ? session.userId : data.ownerId;
    const owner = await validateMember(tx, session.workspaceId, ownerId);
    if (!owner.ok) return owner;
    const contact = toContact(await tx.contact.create({ data: { workspaceId: session.workspaceId, name: data.name, stage: data.stage, company: data.company ?? null, email: data.email ?? null, phone: data.phone ?? null, address: data.address ?? null, notes: data.notes ?? null, tags: data.tags, ownerId } }));
    await createAudit(tx, session, "created", "Contact", contact.id, contact.name, null, contact);
    return ok(contact);
  });
}
/** Apply a validated partial contact update using optimistic concurrency. */
export async function updateContact(id: string, version: number, input: UpdateContactDTO): Promise<Result<Contact>> {
  return withMutation("update", async (tx, session) => {
    const identity = validateIdentity(id, version);
    if (!identity.ok) return identity;
    const parsed = updateContactSchema.safeParse(input);
    if (!parsed.success) return err("VALIDATION", "Проверьте изменения контакта", { fields: parsed.error.flatten() });
    const before = await tx.contact.findUnique({ where: { id_workspaceId: { id, workspaceId: session.workspaceId } } });
    if (!before) return err("NOT_FOUND", "Контакт не найден");
    if (before.version !== version) return err("CONFLICT", "Контакт уже изменён. Обновите страницу");
    const data = parsed.data;
    if (data.ownerId !== undefined) {
      const owner = await validateMember(tx, session.workspaceId, data.ownerId);
      if (!owner.ok) return owner;
    }
    const changes: Prisma.ContactUncheckedUpdateInput = { version: { increment: 1 } };
    if (data.name !== undefined) changes.name = data.name;
    if (data.stage !== undefined) changes.stage = data.stage;
    if (data.company !== undefined) changes.company = data.company;
    if (data.email !== undefined) changes.email = data.email;
    if (data.phone !== undefined) changes.phone = data.phone;
    if (data.address !== undefined) changes.address = data.address;
    if (data.notes !== undefined) changes.notes = data.notes;
    if (data.ownerId !== undefined) changes.ownerId = data.ownerId;
    if (data.tags !== undefined) changes.tags = data.tags;
    const contact = toContact(await tx.contact.update({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version }, data: changes }));
    await createAudit(tx, session, "updated", "Contact", id, contact.name, toContact(before), contact);
    return ok(contact);
  });
}
/** Delete only an unreferenced contact at the expected version, with atomic audit. */
export async function deleteContact(id: string, version: number): Promise<Result<Contact>> {
  return withMutation("delete", async (tx, session) => {
    const identity = validateIdentity(id, version);
    if (!identity.ok) return identity;
    const before = await tx.contact.findUnique({ where: { id_workspaceId: { id, workspaceId: session.workspaceId } } });
    if (!before) return err("NOT_FOUND", "Контакт не найден");
    if (before.version !== version) return err("CONFLICT", "Контакт уже изменён. Обновите страницу");
    const contact = toContact(await tx.contact.delete({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version } }));
    await createAudit(tx, session, "deleted", "Contact", id, contact.name, contact, null);
    return ok(contact);
  });
}
/** Create a normalized deal with an in-workspace contact and exact minor units. */
export async function createDeal(input: CreateDealDTO): Promise<Result<Deal>> {
  return withMutation("create", async (tx, session) => {
    const parsed = dealSchema.safeParse(input);
    if (!parsed.success) return err("VALIDATION", "Проверьте поля сделки", { fields: parsed.error.flatten() });
    const data = parsed.data;
    const contact = await tx.contact.findUnique({ where: { id_workspaceId: { id: data.contactId, workspaceId: session.workspaceId } }, select: { id: true } });
    if (!contact) return err("NOT_FOUND", "Контакт не найден");
    const ownerId = data.ownerId === undefined ? session.userId : data.ownerId;
    const owner = await validateMember(tx, session.workspaceId, ownerId);
    if (!owner.ok) return owner;
    const deal = toDeal(await tx.deal.create({ data: { workspaceId: session.workspaceId, title: data.title, contactId: contact.id, ownerId, stage: data.stage, value: new Prisma.Decimal(data.value), currency: data.currency, expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null, closedAt: data.stage === "WON" || data.stage === "LOST" ? new Date() : null, notes: data.notes ?? null }, include: dealContactInclude }));
    await createAudit(tx, session, "created", "Deal", deal.id, deal.title, null, deal);
    return ok(deal);
  });
}
/** Change stage at the expected version; terminal stages set closedAt, reopening clears it. */
export async function updateDealStage(id: string, version: number, stage: DealStage): Promise<Result<Deal>> {
  return withMutation("update", async (tx, session) => {
    const identity = validateIdentity(id, version);
    if (!identity.ok) return identity;
    if (!DEAL_STAGES.includes(stage)) return err("VALIDATION", "Неизвестный этап сделки");
    const before = await tx.deal.findUnique({ where: { id_workspaceId: { id, workspaceId: session.workspaceId } }, include: dealContactInclude });
    if (!before) return err("NOT_FOUND", "Сделка не найдена");
    if (before.version !== version) return err("CONFLICT", "Сделка уже изменена. Обновите страницу");
    const closedAt = stage === "WON" || stage === "LOST" ? before.stage === stage ? before.closedAt ?? new Date() : new Date() : null;
    const deal = toDeal(await tx.deal.update({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version }, data: { stage, closedAt, version: { increment: 1 } }, include: dealContactInclude }));
    await createAudit(tx, session, "updated", "Deal", id, deal.title, toDeal(before), deal);
    return ok(deal);
  });
}
/** Create a contact/deal activity after checking tenant and assignment references. */
export async function createActivity(input: CreateActivityDTO): Promise<Result<Activity>> {
  return withMutation("create", async (tx, session) => {
    const parsed = activitySchema.safeParse(input);
    if (!parsed.success) return err("VALIDATION", "Проверьте поля активности", { fields: parsed.error.flatten() });
    const data = parsed.data;
    let contactId = data.contactId ?? null;
    if (data.dealId) {
      const deal = await tx.deal.findUnique({ where: { id_workspaceId: { id: data.dealId, workspaceId: session.workspaceId } }, select: { contactId: true } });
      if (!deal) return err("NOT_FOUND", "Сделка не найдена");
      if (contactId && contactId !== deal.contactId) return err("VALIDATION", "Контакт не соответствует контакту сделки");
      contactId = deal.contactId;
    }
    if (contactId && !await tx.contact.findUnique({ where: { id_workspaceId: { id: contactId, workspaceId: session.workspaceId } }, select: { id: true } })) return err("NOT_FOUND", "Контакт не найден");
    const assignedToId = data.assignedToId === undefined ? session.userId : data.assignedToId;
    const assignee = await validateMember(tx, session.workspaceId, assignedToId);
    if (!assignee.ok) return assignee;
    const activity = toActivity(await tx.activity.create({ data: { workspaceId: session.workspaceId, subject: data.subject, type: data.type, contactId, dealId: data.dealId ?? null, assignedToId, description: data.description ?? null, dueAt: data.dueAt ? new Date(data.dueAt) : null } }));
    await createAudit(tx, session, "created", "Activity", activity.id, activity.subject, null, activity);
    return ok(activity);
  });
}
