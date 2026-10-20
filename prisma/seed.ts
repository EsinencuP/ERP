import { createSampleWorkspace } from "./seed-sample";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { DEFAULT_NOTIFICATIONS } from "../src/modules/settings/config-schema";
import { hashPassword } from "../src/lib/password";
import type { Result } from "../src/types/shared";

const db = new PrismaClient();
const schema = z.object({ email: z.string().email(), password: z.string().min(12).max(200), name: z.string().trim().min(2).max(160) });

/** Bootstrap one administrator from explicit environment variables without replacing existing accounts. */
async function createAdmin(): Promise<Result<string>> {
  const input = schema.safeParse({ email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD, name: process.env.SEED_WORKSPACE_NAME ?? "Моя компания" });
  if (!input.success) return { ok: false, error: { code: "CONFIGURATION", message: "Задайте SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD (от 12 символов) и SEED_WORKSPACE_NAME" } };
  const hash = hashPassword(input.data.password);
  if (!hash.ok) return hash;
  try {
    const email = input.data.email.toLowerCase();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return { ok: true, data: "Пользователь уже существует. Данные и пароль не изменены." };
    if (process.env.SEED_ONLY_IF_EMPTY === "true" && await db.user.count() > 0) return { ok: false, error: { code: "CONFIGURATION", message: "В базе уже есть пользователи. Войдите существующим аккаунтом; автоматическое создание администратора остановлено." } };
    await db.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { email, name: "Администратор", role: "ADMIN", passwordHash: hash.data, memberships: { create: { role: "ADMIN", workspace: { create: { name: input.data.name, settings: { create: { companyName: input.data.name, notifications: DEFAULT_NOTIFICATIONS } } } } } } }, include: { memberships: { select: { workspaceId: true } } } });
    const membership = created.memberships[0];
    if (membership) await tx.auditLog.create({ data: { workspaceId: membership.workspaceId, actor: "System bootstrap", domain: "settings", action: "created", entityType: "Settings", entityId: membership.workspaceId, title: "Application configuration", after: { companyName: input.data.name, currency: "EUR", timezone: "Europe/Moscow", dateFormat: "yyyy-MM-dd", version: 1 } } });
    });
    return { ok: true, data: "Администратор и рабочее пространство созданы. Демо-записи в PostgreSQL не импортируются." };
  } catch { return { ok: false, error: { code: "STORAGE", message: "Не удалось создать администратора. Проверьте PostgreSQL и миграции." } }; }
}

/** Dispatch an explicit initialization mode; production bootstrap never imports sample records. */
async function handleSeed(): Promise<Result<string>> {
  const mode = process.env.SEED_MODE ?? "sample";
  if (mode === "sample") return createSampleWorkspace(db);
  if (mode === "bootstrap") return createAdmin();
  return { ok: false, error: { code: "CONFIGURATION", message: "SEED_MODE must be sample or bootstrap" } };
}

handleSeed().then((result) => { if (result.ok) console.info(result.data); else { console.error(result.error.message); process.exitCode = 1; } }).catch(() => { console.error("Ошибка подготовки администратора"); process.exitCode = 1; }).finally(async () => { await db.$disconnect(); });
