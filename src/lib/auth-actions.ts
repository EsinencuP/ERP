"use server";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { isDemoMode } from "@/lib/auth";
import { failure, success } from "@/lib/errors";
import { verifyPassword } from "@/lib/password";
import type { Result } from "@/types/shared";

const loginSchema = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) });

/** Create an opaque, expiring, HttpOnly session after password verification. */
export async function createSession(input: unknown): Promise<Result<true>> {
  if (isDemoMode()) return success(true);
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return failure("VALIDATION", "Введите корректный email и пароль");
  try {
    const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() }, include: { memberships: { orderBy: { workspaceId: "asc" }, take: 1 } } });
    // Use equivalent scrypt work even for an unknown email.
    const verified = verifyPassword(parsed.data.password, user?.passwordHash ?? `${"0".repeat(32)}:${"0".repeat(128)}`);
    const membership = user?.memberships[0];
    if (!user || !membership || !verified.ok || !verified.data) return failure("UNAUTHORIZED", "Неверный email или пароль");
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12);
    await db.session.create({ data: { tokenHash: createHash("sha256").update(token).digest("hex"), userId: user.id, workspaceId: membership.workspaceId, expiresAt } });
    (await cookies()).set("erp_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
    return success(true);
  } catch { return failure("STORAGE", "Не удалось войти. Проверьте подключение к базе данных"); }
}

/** Revoke the current server session and remove its browser cookie. */
export async function deleteSession(): Promise<Result<true>> {
  try {
    const jar = await cookies();
    const token = jar.get("erp_session")?.value;
    if (token && !isDemoMode()) await db.session.deleteMany({ where: { tokenHash: createHash("sha256").update(token).digest("hex") } });
    jar.delete("erp_session");
    return success(true);
  } catch { return failure("STORAGE", "Не удалось завершить сессию"); }
}
