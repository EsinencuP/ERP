import { Faker, en } from "@faker-js/faker";
import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { hashPassword } from "../src/lib/password";
import { generateId } from "../src/lib/utils";
import { calculateInvoice } from "../src/modules/finance/calculations";
import { getLeaveDays } from "../src/modules/hr/leave-days";
import { DEFAULT_NOTIFICATIONS } from "../src/modules/settings/config-schema";
import type { Result } from "../src/types/shared";
import { createSampleTeam, getSampleTeamState } from "./seed-sample-team";

const workspaceId = "evo-sample-v1", adminId = `${workspaceId}-admin`, markerId = `${workspaceId}-complete`;
const id = (entity: string, index: number) => `${workspaceId}-${entity}-${index + 1}`;

/** Record the sample aggregate's non-secret snapshot atomically with its creation. */
async function createAudit(tx: Prisma.TransactionClient, domain: string, entityType: string, entityId: string, title: string, after: Prisma.InputJsonObject, action = "created") {
  await tx.auditLog.create({ data: { workspaceId, actorId: adminId, actor: "Sample initializer", domain, action, entityType, entityId, title, after } });
}

/** Initialize a complete isolated sample tenant once, preserving existing accounts and subsequent edits. */
export async function createSampleWorkspace(db: PrismaClient): Promise<Result<string>> {
  const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const parsed = new Date(value); return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value >= "1900-01-01" && value <= "9998-12-31"; });
  const input = z.object({ email: z.string().email().transform(value => value.toLowerCase()), password: z.string().min(8).max(200), company: z.string().trim().min(2).max(160), reference: calendarDate }).safeParse({ email: process.env.SEED_ADMIN_EMAIL || "admin@erp.dev", password: process.env.SEED_ADMIN_PASSWORD || "Admin123!", company: process.env.SEED_WORKSPACE_NAME || "Evo Sample Company", reference: process.env.SEED_REFERENCE_DATE || new Date().toISOString().slice(0, 10) });
  if (!input.success) return { ok: false, error: { code: "CONFIGURATION", message: "Invalid sample email, password, company or YYYY-MM-DD reference date." } };
  const hash = hashPassword(input.data.password); if (!hash.ok) return hash;
  const faker = new Faker({ locale: en }); faker.seed(27027);
  const reference = new Date(`${input.data.reference}T00:00:00.000Z`), year = reference.getUTCFullYear();
  const date = (offset: number) => new Date(reference.getTime() + offset * 86400000);
  const invoiceItems = Array.from({ length: 5 }, () => Array.from({ length: 2 }, () => ({ description: faker.commerce.productName(), quantity: String(faker.number.int({ min: 1, max: 5 })), unitPrice: String(faker.number.int({ min: 2500, max: 25000 })) })));
  const invoicePlan: { items: (typeof invoiceItems)[number]; totals: Extract<ReturnType<typeof calculateInvoice>, { ok: true }>["data"] }[] = [];
  for (const items of invoiceItems) {
    const result = calculateInvoice(items, "20"); if (!result.ok) return result;
    invoicePlan.push({ items, totals: result.data });
  }
  const leaveStart = date(7).toISOString().slice(0, 10), leaveEnd = date(13).toISOString().slice(0, 10), leaveDays = getLeaveDays(leaveStart, leaveEnd);
  if (!leaveDays.ok) return leaveDays;
  try {
    return await db.$transaction(async tx => {
      // Serialize cooperating seed processes before checking ownership or creating anything.
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(27027)`;
      if (await tx.workspace.findUnique({ where: { id: workspaceId } })) {
        const marker = await tx.auditLog.findUnique({ where: { id: markerId } });
        if (marker?.workspaceId !== workspaceId || marker.entityType !== "SampleSeed") return { ok: false, error: { code: "CONFLICT", message: "Sample workspace identifier already exists without a completion marker. Nothing was changed." } };
        const team = await getSampleTeamState(tx); if (!team.ok) return team;
        if (team.data === "ready") return { ok: true, data: "Sample workspace and training team already initialized. Data, passwords and edits were preserved." };
        await createSampleTeam(tx, { adminId, passwordHash: hash.data, reference });
        return { ok: true, data: "Added five training members and CRM scenarios. Existing records, credentials and edits were preserved." };
      }
      if (await tx.user.findUnique({ where: { email: input.data.email } })) return { ok: false, error: { code: "CONFLICT", message: "Seed email belongs to an existing account. Password, role and memberships were preserved. Choose another SEED_ADMIN_EMAIL." } };
      if (process.env.SEED_ONLY_IF_EMPTY === "true" && await tx.user.count() > 0) return { ok: false, error: { code: "CONFIGURATION", message: "Users already exist; SEED_ONLY_IF_EMPTY stopped sample seeding." } };
      const team = await getSampleTeamState(tx); if (!team.ok) return team;
      if (team.data === "ready") return { ok: false, error: { code: "CONFLICT", message: "Training marker exists without the base sample workspace. Nothing was changed." } };
      await tx.workspace.create({ data: { id: workspaceId, name: input.data.company, settings: { create: { companyName: input.data.company, timezone: "UTC", notifications: DEFAULT_NOTIFICATIONS } } } });
      await tx.user.create({ data: { id: adminId, name: "Sample Administrator", email: input.data.email, passwordHash: hash.data, role: "ADMIN", memberships: { create: { workspaceId, role: "ADMIN" } } } });
      await createAudit(tx, "settings", "Settings", workspaceId, "Application configuration", { companyName: input.data.company, currency: "EUR", timezone: "UTC", version: 1 });
      await createAudit(tx, "settings", "Membership", adminId, "Sample administrator", { role: "ADMIN", isActive: true, version: 1 });

      const contacts = Array.from({ length: 20 }, (_, index) => ({ id: id("contact", index), workspaceId, name: faker.person.fullName(), company: faker.company.name(), email: `contact${index + 1}@example.invalid`, phone: faker.phone.number(), address: faker.location.streetAddress(), stage: (["LEAD", "PROSPECT", "CUSTOMER", "INACTIVE"] as const)[index % 4] ?? "LEAD", ownerId: adminId, tags: [index % 2 ? "partner" : "customer"], notes: "Sample record" }));
      await tx.contact.createMany({ data: contacts });
      for (const row of contacts) await createAudit(tx, "crm", "Contact", row.id, row.name, { name: row.name, stage: row.stage, version: 1 });
      for (let index = 0; index < 10; index++) {
        const stage = (["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const)[index % 6] ?? "NEW";
        const row = await tx.deal.create({ data: { id: id("deal", index), workspaceId, contactId: id("contact", index), ownerId: adminId, title: `${faker.company.buzzNoun()} implementation`, stage, value: String(faker.number.int({ min: 50000, max: 1500000 })), currency: "EUR", expectedCloseDate: date(15 + index), closedAt: stage === "WON" || stage === "LOST" ? date(-index - 1) : null } });
        await createAudit(tx, "crm", "Deal", row.id, row.title, { stage, value: row.value.toFixed(0), currency: "EUR", version: 1 });
      }
      for (let index = 0; index < 3; index++) {
        const row = await tx.warehouse.create({ data: { id: id("warehouse", index), workspaceId, code: `WH-0${index + 1}`, name: ["Central warehouse", "Distribution warehouse", "Retail warehouse"][index] ?? "Warehouse", address: faker.location.streetAddress() } });
        await createAudit(tx, "inventory", "Warehouse", row.id, row.name, { code: row.code, version: 1 });
      }
      for (let index = 0; index < 15; index++) {
        const row = await tx.product.create({ data: { id: id("product", index), workspaceId, sku: `SKU-${String(index + 1).padStart(4, "0")}`, name: faker.commerce.productName(), category: faker.commerce.department(), description: faker.commerce.productDescription(), salePrice: String(faker.number.int({ min: 1500, max: 50000 })), costPrice: "1000", minStock: "5", currency: "EUR" } });
        await createAudit(tx, "inventory", "Product", row.id, row.name, { sku: row.sku, salePrice: row.salePrice.toFixed(0), currency: "EUR", version: 1 });
        if (index % 5 === 0) continue; // Out-of-stock products have no fictitious movement.
        const quantity = index % 5 === 1 ? "3" : String(faker.number.int({ min: 12, max: 45 }));
        const stock = await tx.stockItem.create({ data: { id: id("stock", index), workspaceId, productId: row.id, warehouseId: id("warehouse", index % 3), qty: quantity } });
        const movement = await tx.stockMovement.create({ data: { workspaceId, stockItemId: stock.id, createdById: adminId, type: "IN", quantity, qtyBefore: "0", qtyAfter: quantity, reference: `SEED-OPENING-${row.sku}`, notes: "Sample opening stock" } });
        await createAudit(tx, "inventory", "StockMovement", movement.id, row.name, { type: "IN", quantity, qtyBefore: "0", qtyAfter: quantity, stockItemId: stock.id, version: 1 });
      }
      for (let index = 0; index < 8; index++) {
        const row = await tx.employee.create({ data: { id: id("employee", index), workspaceId, employeeId: `EMP-${String(index + 1).padStart(3, "0")}`, name: index === 0 ? "Sample Administrator" : faker.person.fullName(), email: index === 0 ? input.data.email : `employee${index + 1}@example.invalid`, userId: index === 0 ? adminId : null, phone: faker.phone.number(), position: index === 0 ? "Managing Director" : faker.person.jobTitle(), department: ["Management", "Sales", "Finance", "Operations"][index % 4] ?? "Operations", hireDate: date(-400 - index * 30), status: index === 6 ? "ON_LEAVE" : index === 7 ? "TERMINATED" : "ACTIVE", managerId: index === 0 ? null : id("employee", index > 3 ? 1 : 0) } });
        await createAudit(tx, "hr", "Employee", row.id, row.name, { employeeId: row.employeeId, status: row.status, version: 1 });
        const allowance = await tx.leaveAllowance.create({ data: { workspaceId, employeeId: row.id, year, days: "28" } });
        await createAudit(tx, "hr", "LeaveAllowance", allowance.id, row.name, { employeeId: row.id, year, days: "28", version: 1 });
      }
      for (let index = 0; index < 3; index++) {
        const status = (["PENDING", "APPROVED", "REJECTED"] as const)[index] ?? "PENDING";
        const row = await tx.leave.create({ data: { workspaceId, employeeId: id("employee", index + 2), type: "ANNUAL", status, approvedById: status === "PENDING" ? null : adminId, startDate: new Date(leaveStart), endDate: new Date(leaveEnd), days: leaveDays.data, reason: "Sample annual leave request" } });
        await createAudit(tx, "hr", "Leave", row.id, "Sample annual leave request", { status, days: String(leaveDays.data), startDate: leaveStart, endDate: leaveEnd, version: 1 });
      }
      for (let index = 0; index < 3; index++) {
        const row = await tx.project.create({ data: { id: id("project", index), workspaceId, code: `PRJ-00${index + 1}`, name: `${faker.company.buzzNoun()} rollout`, contactId: id("contact", index), managerId: adminId, status: index === 2 ? "PLANNING" : "ACTIVE", budget: String((index + 1) * 1000000), currency: "EUR", startDate: date(-20 + index * 10), endDate: date(30 + index * 20) } });
        await createAudit(tx, "projects", "Project", row.id, row.name, { status: row.status, budget: row.budget.toFixed(0), currency: "EUR", version: 1 });
        for (let taskIndex = 0; taskIndex < 6; taskIndex++) {
          const status = (["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const)[taskIndex % 4] ?? "TODO";
          const task = await tx.task.create({ data: { workspaceId, projectId: row.id, assignedToId: adminId, title: `${["Discovery", "Planning", "Implementation", "Review", "Documentation", "Handover"][taskIndex]}: ${faker.company.buzzNoun()}`, status, priority: (["LOW", "MEDIUM", "HIGH", "URGENT"] as const)[taskIndex % 4] ?? "MEDIUM", position: taskIndex, dueAt: date(taskIndex * 4 - 3), completedAt: status === "DONE" ? date(-1) : null } });
          await createAudit(tx, "projects", "Task", task.id, task.title, { projectId: row.id, status, version: 1 });
        }
        const expense = await tx.expense.create({ data: { workspaceId, projectId: row.id, createdById: adminId, title: `Project ${index + 1} software subscription`, category: "SOFTWARE", amount: String((index + 1) * 25000), currency: "EUR", date: date(-5 - index * 15) } });
        await createAudit(tx, "finance", "Expense", expense.id, expense.title, { projectId: row.id, amount: expense.amount.toFixed(0), currency: "EUR", version: 1 });
      }
      for (const [index, plan] of invoicePlan.entries()) {
        const { totals, items } = plan;
        const lineItems = items.map((item, position) => ({ position, ...item, total: totals.lineTotals[position] ?? "0" } satisfies Prisma.InvoiceItemUncheckedCreateWithoutInvoiceInput));
        const issueDate = date(index === 2 ? -70 : index === 3 ? -45 : -index * 5), invoiceYear = issueDate.getUTCFullYear();
        const sequence = await tx.invoiceSequence.upsert({ where: { workspaceId_year: { workspaceId, year: invoiceYear } }, create: { workspaceId, year: invoiceYear, value: 1 }, update: { value: { increment: 1 } } });
        const status = (["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"] as const)[index] ?? "DRAFT";
        const row = await tx.invoice.create({ data: { id: id("invoice", index), workspaceId, number: generateId("INV", { year: invoiceYear, value: sequence.value }), contactId: id("contact", index), createdById: adminId, status, currency: "EUR", issuerName: input.data.company, customerSnapshot: { id: id("contact", index), name: contacts[index]?.name ?? "Sample client", email: contacts[index]?.email ?? null, company: contacts[index]?.company ?? null, address: contacts[index]?.address ?? null }, subtotal: totals.subtotal, taxRate: "20", total: totals.total, issueDate, dueDate: date(index === 2 ? -40 : index === 3 ? -15 : 30), items: { create: lineItems } } });
        await createAudit(tx, "finance", "Invoice", row.id, row.number, { status, total: row.total.toFixed(0), currency: "EUR", items, version: 1 });
        if (status === "PAID") {
          const total = BigInt(totals.total), first = total / 2n;
          for (const [part, value] of [first, total - first].entries()) {
            const payment = await tx.payment.create({ data: { workspaceId, invoiceId: row.id, receivedById: adminId, amount: value.toString(), method: "BANK_TRANSFER", reference: `SEED-PAID-${part + 1}`, receivedAt: date(part === 0 ? -25 : -2) } });
            await createAudit(tx, "finance", "Payment", payment.id, row.number, { invoiceId: row.id, amount: value.toString(), currency: "EUR", version: 1 }, "payment");
          }
        }
      }
      await tx.auditLog.create({ data: { id: markerId, workspaceId, actor: "Sample initializer", actorId: adminId, domain: "settings", action: "created", entityType: "SampleSeed", entityId: workspaceId, title: "Sample workspace initialized", after: { seedVersion: 1, referenceDate: input.data.reference, contacts: 20, deals: 10, invoices: 5, products: 15, warehouses: 3, employees: 8, projects: 3, tasks: 18 } } });
      await createSampleTeam(tx, { adminId, passwordHash: hash.data, reference });
      return { ok: true, data: "Sample workspace initialized: 1 admin and 5 training members, 26 contacts, 16 pipeline deals, 5 CRM register records, 5 invoices, 15 products, 3 warehouses, 8 employees, 3 projects and 18 tasks. Currency: EUR. Sample credentials are documented in .env.example." };
    }, { timeout: 60000, maxWait: 60000 });
  } catch { return { ok: false, error: { code: "STORAGE", message: "Sample seed failed and was rolled back. Check PostgreSQL, migrations and conflicting identifiers." } }; }
}
