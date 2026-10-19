import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

// CHECKPOINT-03 uses real HTTP authorization, production Server Actions and isolated PostgreSQL.
const base = process.env.CHECKPOINT_BASE_URL ?? "http://127.0.0.1:3001";
const database = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
assert.ok(["localhost", "127.0.0.1"].includes(database.hostname) && database.port === "5433" && database.pathname === "/erp");
assert.equal(base, "http://127.0.0.1:3001");
const db = new PrismaClient(), prefix = `checkpoint03-${randomBytes(8).toString("hex")}`;
const workspaceIds = [`${prefix}-a`, `${prefix}-b`], roles = ["admin", "reader", "agent", "foreign"];
const password = "Checkpoint03-2026-temporary!", actions = {};
const fixtureFile = new URL("../.data/checkpoint03-fixtures.json", import.meta.url);

async function login(role) {
  const cookies = new Map();
  function remember(response) { for (const item of response.headers.getSetCookie()) { const pair = item.split(";", 1)[0], split = pair.indexOf("="); cookies.set(pair.slice(0, split), pair.slice(split + 1)); } }
  function cookie() { return [...cookies].map(([key, value]) => `${key}=${value}`).join("; "); }
  const csrf = await fetch(`${base}/api/auth/csrf`); remember(csrf);
  const { csrfToken } = await csrf.json();
  const response = await fetch(`${base}/api/auth/callback/credentials`, { method: "POST", redirect: "manual", headers: { Cookie: cookie(), Origin: base, "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" }, body: new URLSearchParams({ csrfToken, email: `${prefix}-${role}@example.invalid`, password, callbackUrl: base }) });
  remember(response);
  const session = await (await fetch(`${base}/api/auth/session`, { headers: { Cookie: cookie() } })).json();
  assert.equal(session.user?.id, `${prefix}-${role}`);
  return cookie();
}
async function action(name, args, cookie) {
  assert.ok(actions[name], `Built action ${name}`);
  const response = await fetch(`${base}/inventory/dashboard`, { method: "POST", headers: { Cookie: cookie, Origin: base, "Next-Action": actions[name], Accept: "text/x-component", "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(args) });
  const body = await response.text(), line = body.split("\n").find((value) => /^\w+:\{"ok":/.test(value));
  assert.ok(line, `${name}: Result expected, HTTP ${response.status}`);
  return JSON.parse(line.slice(line.indexOf(":") + 1));
}
function saved(result) { assert.equal(result.ok, true, JSON.stringify(result)); return result.data; }
function rejected(result, code) { assert.equal(result.ok, false); assert.equal(result.error.code, code); }
const day = (offset = 0) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

test("CHECKPOINT-03: Finance and Inventory", async (t) => {
  let created = false, passed = false, failed = false;
  const check = (name, run) => t.test(name, async () => { try { await run(); } catch (error) { failed = true; throw error; } });
  try {
    const manifest = JSON.parse(await readFile(new URL("../.next/server/server-reference-manifest.json", import.meta.url), "utf8"));
    for (const [id, row] of Object.entries(manifest.node)) if (row.exportedName) actions[row.exportedName] = id;
    await db.$transaction(async (tx) => {
      for (const id of workspaceIds) await tx.workspace.create({ data: { id, name: "CHECKPOINT-03 · Проверка" } });
      for (const [index, role] of ["ADMIN", "READONLY", "AGENT", "ADMIN"].entries()) {
        const salt = randomBytes(16).toString("hex"), id = `${prefix}-${roles[index]}`;
        await tx.user.create({ data: { id, email: `${id}@example.invalid`, name: roles[index], role, passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`, memberships: { create: { workspaceId: workspaceIds[index === 3 ? 1 : 0], role } } } });
      }
    }); created = true;
    const admin = await login("admin"), reader = await login("reader"), agent = await login("agent"), foreign = await login("foreign");
    const call = async (name, ...args) => saved(await action(name, args, admin));
    const contact = await db.contact.create({ data: { workspaceId: workspaceIds[0], name: "Контрольный клиент" } });
    const invoiceInput = { contactId: contact.id, currency: "RUB", issueDate: day(-10), dueDate: day(10), taxRate: "20", items: [{ description: "Разработка · контроль округления", quantity: "1.500", unitPrice: "10001" }] };
    let invoice;
    await check("invoice CRUD, authoritative rounding, numbering and optimistic version", async () => {
      invoice = await call("createInvoice", invoiceInput);
      assert.match(invoice.number, /^INV-\d{4}-\d{4,}$/); assert.equal(invoice.subtotal, "15002"); assert.equal(invoice.taxAmount, "3000"); assert.equal(invoice.total, "18002");
      const changed = { ...invoiceInput, items: [{ description: "Разработка ERP", quantity: "2", unitPrice: "12345" }] };
      invoice = await call("updateInvoice", invoice.id, invoice.version, changed); assert.equal(invoice.total, "29628");
      rejected(await action("updateInvoice", [invoice.id, 1, changed], admin), "CONFLICT");
      const draft = await call("createInvoice", invoiceInput); await call("deleteInvoice", draft.id, draft.version);
      rejected(await action("getInvoice", [draft.id], admin), "NOT_FOUND");
      rejected(await action("createInvoice", [{ ...invoiceInput, workspaceId: workspaceIds[1] }], admin), "VALIDATION");
    });
    await check("issuance, partial/full payments, overpayment and PDF access", async () => {
      invoice = await call("updateInvoiceStatus", invoice.id, invoice.version, "SENT");
      rejected(await action("updateInvoice", [invoice.id, invoice.version, invoiceInput], admin), "CONFLICT");
      invoice = await call("createInvoicePayment", invoice.id, invoice.version, { amount: "10000", reference: `${prefix}-partial` }); assert.equal(invoice.status, "SENT");
      rejected(await action("createInvoicePayment", [invoice.id, invoice.version, { amount: "19629", reference: `${prefix}-too-much` }], admin), "VALIDATION");
      invoice = await call("createInvoicePayment", invoice.id, invoice.version, { amount: "19628", reference: `${prefix}-final` }); assert.equal(invoice.status, "PAID"); assert.equal(invoice.balance, "0");
      const url = `${base}/api/finance/invoices/${invoice.id}/pdf`;
      const pdf = await fetch(url, { headers: { Cookie: admin } }); assert.equal(pdf.status, 200); assert.match(pdf.headers.get("content-type"), /application\/pdf/); assert.match(pdf.headers.get("content-disposition"), /attachment/);
      const bytes = Buffer.from(await pdf.arrayBuffer()); assert.equal(bytes.subarray(0, 5).toString(), "%PDF-"); assert.ok(bytes.length > 1000); await writeFile(new URL("../.data/checkpoint03-invoice.pdf", import.meta.url), bytes);
      for (const [cookie, status] of [["", 401], [reader, 403], [agent, 403], [foreign, 404]]) assert.equal((await fetch(url, { headers: { Cookie: cookie } })).status, status);
    });
    await check("finance KPIs, six-month revenue, statuses and AR aging", async () => {
      const simple = { ...invoiceInput, taxRate: "0", items: [{ description: "Услуга", quantity: "1", unitPrice: "10000" }], dueDate: day(-1) };
      let overdue = await call("createInvoice", simple); overdue = await call("updateInvoiceStatus", overdue.id, overdue.version, "SENT");
      await call("createInvoicePayment", overdue.id, overdue.version, { amount: "2500", reference: `${prefix}-overdue` });
      let sent = await call("createInvoice", { ...simple, dueDate: day(10), items: [{ description: "Будущий платёж", quantity: "1", unitPrice: "20000" }] }); await call("updateInvoiceStatus", sent.id, sent.version, "SENT");
      const cancelled = await call("createInvoice", simple); await call("updateInvoiceStatus", cancelled.id, cancelled.version, "CANCELLED");
      const report = await call("getFinanceDashboard", "RUB");
      assert.deepEqual(report.kpis, { totalRevenue: "32128", outstanding: "27500", paidMtd: "32128", overdue: "7500", openCount: 2, overdueCount: 1 });
      assert.equal(report.revenue.length, 6); assert.equal(report.revenue.at(-1).amount, "32128"); assert.equal(report.topClients[0].amount, "32128");
      assert.equal(report.statuses.find((row) => row.status === "PAID").count, 1); assert.equal(report.statuses.find((row) => row.status === "OVERDUE").count, 1);
      assert.equal(report.aging.reduce((sum, row) => sum + BigInt(row.amount), 0n), 27500n);
    });
    await check("expense CRUD/category, P&L paid invoices and exact protected CSV", async () => {
      const input = { title: " Лицензия ERP ", amount: "1000", currency: "RUB", category: "SOFTWARE", date: day(), receipt: "https://example.invalid/receipt", notes: "" };
      let expense = await call("createExpense", input); assert.equal(expense.title, "Лицензия ERP");
      expense = await call("updateExpense", expense.id, expense.version, { ...input, amount: "2000" });
      rejected(await action("updateExpense", [expense.id, 1, input], admin), "CONFLICT");
      rejected(await action("createExpense", [{ ...input, receipt: "javascript:alert(1)" }], admin), "VALIDATION");
      const expendable = await call("createExpense", input); await call("deleteExpense", expendable.id, expendable.version);
      assert.equal((await call("getExpenses", { category: "SOFTWARE" })).total, 1);
      const filters = { from: day(-2), to: day(2), currency: "RUB" }, pnl = await call("getPnlReport", filters);
      assert.equal(pnl.revenue, "29628"); assert.equal(pnl.expenses, "2000"); assert.equal(pnl.netProfit, "27628");
      const url = `${base}/api/reports/export?type=pnl&from=${filters.from}&to=${filters.to}&currency=RUB`, csv = await fetch(url, { headers: { Cookie: admin } });
      assert.equal(csv.status, 200); const bytes = Buffer.from(await csv.arrayBuffer()); assert.equal(bytes.subarray(0, 3).toString("hex"), "efbbbf");
      for (const amount of ["296.28", "20.00", "276.28"]) assert.ok(bytes.toString().includes(amount));
      assert.equal((await fetch(url, { headers: { Cookie: reader } })).status, 403);
      assert.equal((await fetch(`${base}/api/reports/export?type=pnl&from=bad&to=bad`, { headers: { Cookie: admin } })).status, 400);
    });
    const products = [], warehouseInput = { code: "MAIN", name: "Основной склад", address: "", isActive: true };
    let main, target;
    const productInput = (index, price, min, currency = "RUB") => ({ sku: `CHECK-${index}`, name: `Товар ${index} · Проверка`, category: "Комплектующие", description: "", unit: "pcs", currency, salePrice: price, minStock: min, isActive: true });
    const move = async (product, type, quantity, extra = {}) => {
      const position = await call("getStockPosition", product.id, main.id);
      return call("createStockMovement", { productId: product.id, warehouseId: main.id, stockVersion: position.version, type, quantity, reference: "CHECKPOINT-03", ...extra });
    };
    await check("warehouse CRUD, exact IN/OUT/ADJUSTMENT/TRANSFER and concurrent version guard", async () => {
      main = await call("createWarehouse", warehouseInput); target = await call("createWarehouse", { ...warehouseInput, code: "SECOND", name: "Резервный склад" });
      const unused = await call("createWarehouse", { ...warehouseInput, code: "UNUSED" }); await call("deleteWarehouse", unused.id, unused.version);
      const p = await call("createProduct", productInput(1, "101", "5")); products.push(p);
      await move(p, "IN", "10.125"); await move(p, "OUT", "2.125"); await move(p, "ADJUSTMENT", "-3");
      const transfer = await move(p, "TRANSFER", "2", { targetWarehouseId: target.id, targetStockVersion: 0 }); assert.equal(transfer.movements.length, 2); assert.ok(transfer.transferId);
      const position = await call("getStockPosition", p.id, main.id), input = { productId: p.id, warehouseId: main.id, stockVersion: position.version, type: "OUT", quantity: "2" };
      const concurrent = await Promise.all([action("createStockMovement", [input], admin), action("createStockMovement", [input], admin)]);
      assert.equal(concurrent.filter((row) => row.ok).length, 1); rejected(concurrent.find((row) => !row.ok), "CONFLICT");
      assert.equal((await call("getProduct", p.id)).stock, "3.000");
      rejected(await action("createStockMovement", [{ ...input, stockVersion: position.version + 1 }], admin), "VALIDATION");
      const ledger = await call("getProductMovements", p.id, {}); assert.equal(ledger.total, 6);
      assert.equal((await call("getProductMovements", p.id, { type: "TRANSFER" })).total, 2);
    });
    await check("inventory KPIs, precise multi-currency value, thresholds, inactive warehouse and pagination", async () => {
      for (const [index, price, min, qty, currency] of [[2, "200", "2", "1", "RUB"], [3, "5000", "0", "0", "RUB"], [4, "333", "1", "0.001", "RUB"], [5, "100", "0", "0.005", "RUB"], [6, "999", "0", "1", "USD"], [7, "1000", "0", "100", "RUB"], [8, "9007199254740993", "0", "2", "EUR"]]) {
        const input = productInput(index, price, min, currency), product = await call("createProduct", input); products.push(product);
        if (qty !== "0") await move(product, "IN", qty);
        if (index === 7) await call("updateProduct", product.id, product.version, { ...input, isActive: false });
      }
      target = await call("updateWarehouse", target.id, target.version, { ...warehouseInput, code: "SECOND", name: "Резервный склад", isActive: false });
      const result = await call("getInventoryDashboard", { pageSize: 2 });
      assert.deepEqual(result.kpis, { totalProducts: 7, lowStockCount: 3, outOfStock: 1, totalValues: [{ currency: "EUR", amount: "18014398509481986" }, { currency: "RUB", amount: "504" }, { currency: "USD", amount: "999" }] });
      assert.equal(result.alerts.total, 4); assert.equal(result.alerts.data.length, 2);
      const next = await call("getInventoryDashboard", { page: 2, pageSize: 2 }); assert.ok(next.alerts.data.every((row) => !result.alerts.data.some((first) => first.id === row.id)));
      const filtered = await call("getInventoryDashboard", { search: "Товар 3", stockStatus: "out_of_stock" }); assert.equal(filtered.alerts.total, 1); assert.deepEqual(filtered.kpis, result.kpis);
      await move(products[1], "OUT", "1"); const updated = await call("getInventoryDashboard", {});
      assert.equal(updated.kpis.lowStockCount, 2); assert.equal(updated.kpis.outOfStock, 2); assert.equal(updated.kpis.totalValues.find((row) => row.currency === "RUB").amount, "304");
      assert.deepEqual(await call("getInventoryStockAlert"), { lowStock: 2, outOfStock: 2, total: 4 });
    });
    await check("immutable ledger, audit rollback and transfer database constraints", async () => {
      const stock = await db.stockItem.findFirstOrThrow({ where: { workspaceId: workspaceIds[0], productId: products[0].id, warehouseId: main.id } });
      const ledger = await db.stockMovement.findFirstOrThrow({ where: { stockItemId: stock.id } });
      await assert.rejects(db.stockMovement.update({ where: { id: ledger.id }, data: { notes: "mutated" } }));
      await assert.rejects(db.stockMovement.delete({ where: { id: ledger.id } }));
      await assert.rejects(db.$transaction((tx) => tx.stockMovement.create({ data: { workspaceId: workspaceIds[0], stockItemId: stock.id, type: "TRANSFER_IN", quantity: "1", qtyBefore: "1", qtyAfter: "2", transferId: randomBytes(16).toString("hex") } })));
      const before = { rows: await db.stockMovement.count({ where: { workspaceId: workspaceIds[0] } }), audit: await db.auditLog.count({ where: { workspaceId: workspaceIds[0] } }) };
      // Controlled local-only failure proves ledger, balance and audit share one transaction.
      await db.$executeRawUnsafe(`ALTER TABLE "AuditEvent" ADD CONSTRAINT checkpoint03_audit_failure CHECK ("workspaceId" <> '${workspaceIds[0]}' OR "entityType" <> 'StockMovement') NOT VALID`);
      try { rejected(await action("createStockMovement", [{ productId: products[0].id, warehouseId: main.id, stockVersion: stock.version, type: "IN", quantity: "1" }], admin), "STORAGE"); }
      finally { await db.$executeRawUnsafe('ALTER TABLE "AuditEvent" DROP CONSTRAINT checkpoint03_audit_failure'); }
      const after = await db.stockItem.findUniqueOrThrow({ where: { id: stock.id } }); assert.equal(after.qty.toFixed(3), stock.qty.toFixed(3)); assert.equal(after.version, stock.version);
      assert.equal(await db.stockMovement.count({ where: { workspaceId: workspaceIds[0] } }), before.rows); assert.equal(await db.auditLog.count({ where: { workspaceId: workspaceIds[0] } }), before.audit);
    });
    await check("tenant isolation, READONLY reads, write RBAC and strict filters", async () => {
      const empty = saved(await action("getInventoryDashboard", [{}], foreign)); assert.equal(empty.kpis.totalProducts, 0); assert.equal(empty.alerts.total, 0); assert.deepEqual(empty.kpis.totalValues, []);
      assert.equal(saved(await action("getInventoryDashboard", [{}], reader)).kpis.totalProducts, 7);
      for (const [name, args] of [["getProduct", [products[0].id]], ["getInvoice", [invoice.id]], ["getProductMovements", [products[0].id]]]) rejected(await action(name, args, foreign), "NOT_FOUND");
      rejected(await action("createProduct", [productInput(99, "1", "0")], reader), "FORBIDDEN");
      rejected(await action("createStockMovement", [{ productId: products[0].id, warehouseId: main.id, stockVersion: 5, type: "IN", quantity: "1" }], reader), "FORBIDDEN");
      rejected(await action("deleteProduct", [products[0].id, 1], agent), "FORBIDDEN");
      rejected(await action("getInventoryDashboard", [{ workspaceId: workspaceIds[1] }], admin), "VALIDATION");
      rejected(await action("getInventoryDashboard", [{ stockStatus: "in_stock" }], admin), "VALIDATION");
    });
    await writeFile(fixtureFile, JSON.stringify({ prefix, workspaceIds, userIds: roles.map((role) => `${prefix}-${role}`), products, main, target, invoice }, null, 2));
    passed = !failed;
  } finally {
    try {
      if (created && !(passed && process.env.CHECKPOINT_KEEP_FIXTURES === "true")) await db.$transaction(async (tx) => {
        const where = { workspaceId: { in: workspaceIds } };
        await tx.$executeRawUnsafe('ALTER TABLE "StockMovement" DISABLE TRIGGER stock_movement_immutable');
        await tx.stockMovement.deleteMany({ where });
        await tx.$executeRawUnsafe('ALTER TABLE "StockMovement" ENABLE TRIGGER stock_movement_immutable');
        for (const name of ["auditLog", "payment", "invoice", "invoiceSequence", "expense", "stockItem", "product", "warehouse", "contact", "session", "membership"]) await tx[name].deleteMany({ where });
        await tx.user.deleteMany({ where: { id: { in: roles.map((role) => `${prefix}-${role}`) } } });
        await tx.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
      });
    } finally { await db.$disconnect(); }
  }
});
