import { PrismaClient } from "@prisma/client";
import { z } from "zod";
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
    await db.user.create({ data: { email, name: "Администратор", role: "ADMIN", passwordHash: hash.data, memberships: { create: { role: "ADMIN", workspace: { create: { name: input.data.name } } } } } });
    return { ok: true, data: "Администратор и рабочее пространство созданы. Демо-записи в PostgreSQL не импортируются." };
  } catch { return { ok: false, error: { code: "STORAGE", message: "Не удалось создать администратора. Проверьте PostgreSQL и миграции." } }; }
}

createAdmin().then((result) => { if (result.ok) console.info(result.data); else { console.error(result.error.message); process.exitCode = 1; } }).catch(() => { console.error("Ошибка подготовки администратора"); process.exitCode = 1; }).finally(async () => { await db.$disconnect(); });
