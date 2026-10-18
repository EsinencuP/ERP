import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

// CHECKPOINT-02 integration checks. Run against a local production server with
// ERP_DEMO_MODE=false and an ephemeral AUTH_SECRET; never use a remote database.
const base = process.env.CHECKPOINT_BASE_URL ?? "http://127.0.0.1:3001";
const database = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
const server = new URL(base);
assert.ok(["localhost", "127.0.0.1"].includes(database.hostname) && database.port === "5433" && database.pathname === "/erp", "Only the isolated local checkpoint database is allowed");
assert.ok(server.hostname === "127.0.0.1" && server.port === "3001" && server.protocol === "http:", "Only the local checkpoint server is allowed");

const db = new PrismaClient();
const prefix = `checkpoint02-${randomBytes(8).toString("hex")}`;
const workspaceIds = [`${prefix}-a`, `${prefix}-b`];
const userIds = ["admin", "reader", "foreign"].map((role) => `${prefix}-${role}`);
const password = randomBytes(24).toString("base64url");
const actions = {};

async function login(role) {
  const cookies = new Map();
  function remember(response) {
    for (const item of response.headers.getSetCookie()) {
      const pair = item.split(";", 1)[0];
      const split = pair.indexOf("=");
      cookies.set(pair.slice(0, split), pair.slice(split + 1));
    }
  }
  function cookie() { return [...cookies].map(([key, value]) => `${key}=${value}`).join("; "); }
  const csrfResponse = await fetch(`${base}/api/auth/csrf`);
  remember(csrfResponse);
  const { csrfToken } = await csrfResponse.json();
  const response = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST", redirect: "manual", headers: { Cookie: cookie(), Origin: base, "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" },
    body: new URLSearchParams({ csrfToken, email: `${prefix}-${role}@example.invalid`, password, callbackUrl: base }),
  });
  remember(response);
  const session = await (await fetch(`${base}/api/auth/session`, { headers: { Cookie: cookie() } })).json();
  assert.equal(session.user?.id, `${prefix}-${role}`, "Credentials must resolve the fixture user");
  return cookie();
}

async function action(name, args, cookie) {
  assert.ok(actions[name], `Built Server Action ${name} exists`);
  const response = await fetch(`${base}/crm/contacts`, {
    method: "POST", headers: { Cookie: cookie, Origin: base, "Next-Action": actions[name], Accept: "text/x-component", "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(args),
  });
  const body = await response.text();
  const line = body.split("\n").find((value) => /^\w+:\{"ok":/.test(value));
  assert.ok(line, `${name} must return a Result (HTTP ${response.status})`);
  return JSON.parse(line.slice(line.indexOf(":") + 1));
}

test("CHECKPOINT-02: authenticated CRM, tenant/RBAC, version and audit", async (t) => {
  let createdWorkspace = false;
  try {
    const manifest = JSON.parse(await readFile(new URL("../.next/server/server-reference-manifest.json", import.meta.url), "utf8"));
    for (const [id, row] of Object.entries(manifest.node)) if (row.exportedName) actions[row.exportedName] = id;
    await db.$transaction(async (tx) => {
      for (const id of workspaceIds) await tx.workspace.create({ data: { id, name: prefix } });
      for (const [index, role] of ["ADMIN", "READONLY", "ADMIN"].entries()) {
        const salt = randomBytes(16).toString("hex");
        await tx.user.create({ data: { id: userIds[index], email: `${userIds[index]}@example.invalid`, name: userIds[index], role, passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`, memberships: { create: { workspaceId: workspaceIds[index === 2 ? 1 : 0], role } } } });
      }
    });
    createdWorkspace = true;
    const admin = await login("admin"), reader = await login("reader"), foreign = await login("foreign");
    let contact;

    await t.test("create normalizes fields and writes exactly one audit snapshot", async () => {
      const saved = await action("createContact", [{ name: "  Checkpoint Contact  ", email: "CHECK@example.invalid", tags: [" Новое "] }], admin);
      assert.equal(saved.ok, true);
      contact = saved.data;
      assert.equal(contact.workspaceId, workspaceIds[0]); assert.equal(contact.name, "Checkpoint Contact"); assert.equal(contact.email, "check@example.invalid"); assert.deepEqual(contact.tags, ["Новое"]);
      assert.equal(await db.auditLog.count({ where: { workspaceId: workspaceIds[0], entityId: contact.id, action: "created" } }), 1);
    });
    await t.test("invalid form data and injected workspace fail validation", async () => {
      for (const input of [{ name: "" }, { name: "X", email: "bad" }, { name: "X", workspaceId: workspaceIds[1] }]) {
        const result = await action("createContact", [input], admin);
        assert.equal(result.ok, false); assert.equal(result.error.code, "VALIDATION");
      }
    });
    await t.test("READONLY cannot create, update or delete despite crafted requests", async () => {
      for (const [name, args] of [["createContact", [{ name: "Forbidden" }]], ["updateContact", [contact.id, 1, { name: "Forbidden" }]], ["deleteContact", [contact.id, 1]]]) {
        const result = await action(name, args, reader); assert.equal(result.ok, false); assert.equal(result.error.code, "FORBIDDEN");
      }
    });
    await t.test("other workspace cannot read or change the contact or its feed", async () => {
      for (const [name, args] of [["getContactDetail", [contact.id]], ["getContactActivities", [contact.id]], ["updateContact", [contact.id, 1, { name: "Foreign" }]]]) {
        const result = await action(name, args, foreign); assert.equal(result.ok, false); assert.equal(result.error.code, "NOT_FOUND");
      }
    });
    await t.test("snapshot version rejects stale writes without a second audit", async () => {
      const saved = await action("updateContact", [contact.id, 1, { stage: "CUSTOMER" }], admin); assert.equal(saved.ok, true); assert.equal(saved.data.version, 2);
      const stale = await action("updateContact", [contact.id, 1, { name: "Stale overwrite" }], admin); assert.equal(stale.ok, false); assert.equal(stale.error.code, "CONFLICT");
      assert.equal((await db.contact.findUnique({ where: { id: contact.id } })).name, "Checkpoint Contact");
      assert.equal(await db.auditLog.count({ where: { entityId: contact.id, workspaceId: workspaceIds[0], action: "updated" } }), 1);
    });
    await t.test("contacts query applies stage, search and stable sort", async () => {
      const result = await action("getContacts", [{ search: "Checkpoint", stage: "CUSTOMER", sort: { field: "name", direction: "asc" } }], reader);
      assert.equal(result.ok, true); assert.equal(result.data.total, 1); assert.equal(result.data.data[0].id, contact.id);
    });
    let deal;
    await t.test("pipeline keeps exact money and a versioned stage move", async () => {
      const saved = await action("createDeal", [{ title: "Checkpoint Deal", contactId: contact.id, value: "12345678901234567890", stage: "NEW" }], admin); assert.equal(saved.ok, true); deal = saved.data;
      assert.equal(deal.value, "12345678901234567890");
      const moved = await action("updateDealStage", [deal.id, 1, "QUALIFIED"], admin); assert.equal(moved.ok, true);
      const board = await action("getDealsByStage", [{}], reader); assert.equal(board.ok, true); assert.equal(Object.keys(board.data).length, 6); assert.equal(board.data.QUALIFIED.data[0].id, deal.id);
    });
    await t.test("contact detail includes its activity and related deal", async () => {
      const saved = await action("createActivity", [{ contactId: contact.id, dealId: deal.id, type: "NOTE", subject: "Checkpoint Note" }], admin); assert.equal(saved.ok, true);
      const detail = await action("getContactDetail", [contact.id], reader); assert.equal(detail.ok, true); assert.equal(detail.data.activities.data[0].subject, "Checkpoint Note"); assert.equal(detail.data.deals.data[0].id, deal.id);
    });
  } finally {
    try {
      if (createdWorkspace) await db.$transaction(async (tx) => {
        const where = { workspaceId: { in: workspaceIds } };
        await tx.auditLog.deleteMany({ where }); await tx.activity.deleteMany({ where }); await tx.deal.deleteMany({ where }); await tx.contact.deleteMany({ where }); await tx.session.deleteMany({ where }); await tx.membership.deleteMany({ where }); await tx.user.deleteMany({ where: { id: { in: userIds } } }); await tx.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
      });
    } finally { await db.$disconnect(); }
  }
});
