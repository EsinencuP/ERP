import { Prisma, type UserRole } from "@prisma/client";
import type { Result } from "../src/types/shared";

const workspaceId = "evo-sample-v1", prefix = "evo-sample-team-v2", markerId = `${prefix}-complete`;
const members = [
  { key: "sales", name: "Emma Carter", email: "sales@sample.erp.example", role: "MANAGER" },
  { key: "finance", name: "Noah Bennett", email: "finance@sample.erp.example", role: "AGENT" },
  { key: "warehouse", name: "Olivia Reed", email: "warehouse@sample.erp.example", role: "AGENT" },
  { key: "projects", name: "Lucas Brooks", email: "projects@sample.erp.example", role: "MANAGER" },
  { key: "analyst", name: "Ava Chen", email: "analyst@sample.erp.example", role: "READONLY" },
] as const satisfies readonly { key: string; name: string; email: string; role: UserRole }[];
const entityId = (entity: string, index: number) => `${prefix}-${entity}-${index + 1}`;

/** Preflight the additive sample pack before any writes; never adopt existing global accounts. */
export async function getSampleTeamState(tx: Prisma.TransactionClient): Promise<Result<"ready" | "missing">> {
  const marker = await tx.auditLog.findUnique({ where: { id: markerId } });
  if (marker) return marker.workspaceId === workspaceId && marker.entityType === "SampleTeamSeed"
    ? { ok: true, data: "ready" } : { ok: false, error: { code: "CONFLICT", message: "Sample team marker belongs to another dataset. Nothing was changed." } };
  const collision = await tx.user.findFirst({ where: { OR: [{ id: { in: members.map(member => `${prefix}-${member.key}`) } }, { email: { in: members.map(member => member.email) } }] }, select: { id: true } });
  if (collision) return { ok: false, error: { code: "CONFLICT", message: "A training account exists without its completion marker. Existing credentials and memberships were preserved." } };
  const contact = await tx.contact.findFirst({ where: { id: { in: Array.from({ length: 6 }, (_, i) => entityId("contact", i)) } }, select: { id: true } });
  const deal = await tx.deal.findFirst({ where: { id: { in: Array.from({ length: 6 }, (_, i) => entityId("deal", i)) } }, select: { id: true } });
  const document = await tx.document.findFirst({ where: { id: { in: Array.from({ length: 5 }, (_, i) => entityId("record", i)) } }, select: { id: true } });
  return contact || deal || document
    ? { ok: false, error: { code: "CONFLICT", message: "Training scenario identifiers are occupied. Nothing was changed." } }
    : { ok: true, data: "missing" };
}

/** Create fictional team/history/CRM examples inside the caller's preflighted transaction. */
export async function createSampleTeam(tx: Prisma.TransactionClient, input: { adminId: string; passwordHash: string; reference: Date }): Promise<void> {
  const date = (days: number, hour = 10) => new Date(input.reference.getTime() + days * 86400000 + hour * 3600000);
  const admin = await tx.user.findUniqueOrThrow({ where: { id: input.adminId }, select: { name: true } });
  async function audit(entityType: string, id: string, title: string, actorId: string, actor: string, createdAt: Date, before: Prisma.InputJsonObject | null, after: Prisma.InputJsonObject) {
    await tx.auditLog.create({ data: { workspaceId, entityType, entityId: id, title, actorId, actor, domain: entityType === "Membership" ? "settings" : "crm", action: before ? "updated" : "created", requestId: prefix, before: before ?? Prisma.DbNull, after: { ...after, sampleScenario: prefix, illustrativeOccurredAt: createdAt.toISOString() } } });
  }
  for (const [index, member] of members.entries()) {
    const userId = `${prefix}-${member.key}`, createdAt = date(-30 + index), lastLoginAt = date(-2 - index, 8 + index);
    await tx.user.create({ data: { id: userId, email: member.email, name: member.name, role: member.role, passwordHash: input.passwordHash, createdAt, updatedAt: createdAt } });
    let current = await tx.membership.create({ data: { workspaceId, userId, role: "READONLY", createdAt, updatedAt: createdAt, lastLoginAt } });
    await audit("Membership", userId, member.email, input.adminId, admin.name, createdAt, null, { name: member.name, role: current.role, isActive: true, version: current.version });
    if (member.role !== "READONLY") {
      const before = { role: current.role, isActive: current.isActive, version: current.version }, changedAt = date(-24 + index);
      current = await tx.membership.update({ where: { userId_workspaceId: { userId, workspaceId } }, data: { role: member.role, version: { increment: 1 }, updatedAt: changedAt } });
      await audit("Membership", userId, member.email, input.adminId, admin.name, changedAt, before, { role: current.role, isActive: current.isActive, version: current.version });
    }
    if (member.key === "finance" || member.key === "analyst") {
      const before = { role: current.role, isActive: current.isActive, version: current.version }, changedAt = date(member.key === "finance" ? -10 : -5);
      current = await tx.membership.update({ where: { userId_workspaceId: { userId, workspaceId } }, data: { isActive: false, version: { increment: 1 }, updatedAt: changedAt } });
      await audit("Membership", userId, member.email, input.adminId, admin.name, changedAt, before, { role: current.role, isActive: false, version: current.version });
      if (member.key === "finance") {
        const previous = { role: current.role, isActive: false, version: current.version }, restoredAt = date(-9);
        current = await tx.membership.update({ where: { userId_workspaceId: { userId, workspaceId } }, data: { isActive: true, version: { increment: 1 }, updatedAt: restoredAt } });
        await audit("Membership", userId, member.email, input.adminId, admin.name, restoredAt, previous, { role: current.role, isActive: true, version: current.version });
      }
    }
  }
  const cases = [
    { company: "Northstar Retail", person: "Sophie Allen", title: "Customer portal discovery", stage: "NEW", amount: "480000" },
    { company: "Horizon Logistics", person: "Daniel Hughes", title: "Warehouse workflow assessment", stage: "QUALIFIED", amount: "720000" },
    { company: "Cedar Studio", person: "Mia Foster", title: "Website support proposal", stage: "PROPOSAL", amount: "350000" },
    { company: "Summit Foods", person: "Oliver Parker", title: "ERP integration agreement", stage: "NEGOTIATION", amount: "1280000" },
    { company: "Atlas Manufacturing", person: "Grace Turner", title: "Production dashboard rollout", stage: "WON", amount: "960000" },
    { company: "Bluebird Travel", person: "Ethan Scott", title: "Booking platform renewal", stage: "LOST", amount: "560000" },
  ] as const;
  for (const [index, sample] of cases.entries()) {
    const owner = members[index % 2 === 0 ? 0 : 3], ownerId = `${prefix}-${owner.key}`, createdAt = date(-18 + index);
    const contact = await tx.contact.create({ data: { id: entityId("contact", index), workspaceId, name: sample.person, company: sample.company, email: `contact@${sample.company.toLowerCase().replaceAll(" ", "-")}.example`, stage: sample.stage === "WON" ? "CUSTOMER" : "PROSPECT", ownerId, tags: ["sample", "public-training"], notes: "Fictional public training scenario", createdAt: date(-20 + index) } });
    await audit("Contact", contact.id, contact.name, ownerId, owner.name, contact.createdAt, null, { name: contact.name, company: contact.company, stage: contact.stage, version: 1 });
    let deal = await tx.deal.create({ data: { id: entityId("deal", index), workspaceId, title: sample.title, contactId: contact.id, ownerId, stage: "NEW", value: sample.amount, currency: "EUR", expectedCloseDate: date(14 + index), notes: "Fictional public training scenario", createdAt } });
    await audit("Deal", deal.id, deal.title, ownerId, owner.name, createdAt, null, { stage: "NEW", value: sample.amount, currency: "EUR", version: 1 });
    if (sample.stage !== "NEW") {
      const changedAt = date(-2), before = { stage: "NEW", value: sample.amount, currency: "EUR", version: 1 };
      deal = await tx.deal.update({ where: { id: deal.id }, data: { stage: sample.stage, closedAt: sample.stage === "WON" || sample.stage === "LOST" ? changedAt : null, version: { increment: 1 }, updatedAt: changedAt } });
      await audit("Deal", deal.id, deal.title, ownerId, owner.name, changedAt, before, { stage: deal.stage, value: sample.amount, currency: "EUR", version: deal.version });
    }
    const activity = await tx.activity.create({ data: { workspaceId, contactId: contact.id, dealId: deal.id, assignedToId: ownerId, type: (["CALL", "MEETING", "EMAIL", "NOTE", "TASK", "NOTE"] as const)[index] ?? "NOTE", subject: ["Initial call", "Requirements meeting", "Proposal follow-up", "Commercial terms review", "Handover planning", "Decision recorded"][index] ?? "Sample note", description: "Fictional interaction for exploring the contact timeline.", dueAt: date(index === 4 ? 2 : -1), completedAt: index === 4 ? null : date(-1), createdAt: date(-1) } });
    await audit("Activity", activity.id, activity.subject, ownerId, owner.name, activity.createdAt, null, { type: activity.type, contactId: contact.id, dealId: deal.id, version: 1 });
  }
  const statuses = ["Новая", "Предложение", "Переговоры", "Выиграна", "Проиграна"] as const;
  for (let index = 0; index < statuses.length; index++) {
    const data = { title: `Sample — service contract ${index + 1}`, subtitle: ["Willow Partners", "Oakline Services", "Silverlane Group", "Bright Coast", "Greenfield Works"][index] ?? "Sample company", status: statuses[index] ?? "Новая", amount: (index + 1) * 180000, quantity: 1, email: `support${index + 1}@sample.example`, date: date(10 + index).toISOString().slice(0, 10), progress: index * 20, notes: "Fictional standalone CRM register example, independent from the contact-linked pipeline." };
    const record = await tx.document.create({ data: { id: entityId("record", index), workspaceId, domain: "crm", data, createdAt: date(-6 + index), updatedAt: date(-1) } });
    await audit("Document", record.id, data.title, `${prefix}-sales`, members[0].name, record.createdAt, null, { ...data, version: 1 });
  }
  await tx.auditLog.create({ data: { id: markerId, workspaceId, actorId: input.adminId, actor: "Sample initializer", domain: "settings", action: "created", entityType: "SampleTeamSeed", entityId: workspaceId, title: "Public training team initialized", requestId: prefix, after: { seedVersion: 2, fictional: true, addedMembers: 5, addedContacts: 6, addedDeals: 6, addedActivities: 6, addedCrmRecords: 5 } } });
}
