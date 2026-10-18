"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { deleteCurrentSession, hasAuthSecret, isDemoMode, loginSchema } from "@/lib/auth-service";
import { err, ok } from "@/lib/errors";
import type { Result } from "@/types/shared";

/** Authenticate through Credentials; library exceptions stop at this Result boundary. */
export async function createSession(input: unknown): Promise<Result<true>> {
  if (isDemoMode()) return ok(true);
  if (!hasAuthSecret()) return err("CONFIGURATION", "Для входа задайте AUTH_SECRET в окружении сервера");
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return err("VALIDATION", "Введите корректный email и пароль");
  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
    return ok(true);
  } catch (error: unknown) {
    if (error instanceof AuthError && error.type === "CredentialsSignin") return err("UNAUTHORIZED", "Не удалось войти. Проверьте данные и доступ к рабочему пространству");
    return err("STORAGE", "Сервис входа недоступен. Попробуйте снова");
  }
}

/** Revoke the exact server registry row through Auth.js and clear its cookies. */
export async function deleteSession(): Promise<Result<true>> {
  if (isDemoMode()) return ok(true);
  try {
    const revoked = await deleteCurrentSession();
    if (!revoked.ok) return revoked;
    await signOut({ redirect: false });
    return ok(true);
  } catch { return err("STORAGE", "Не удалось завершить сессию. Повторите попытку"); }
}
