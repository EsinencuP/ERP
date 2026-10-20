"use server";
import { localizeResult } from "@/i18n/server";


import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { deleteCurrentSession, hasAuthSecret, isDemoMode, loginSchema } from "@/lib/auth-service";
import { err, ok } from "@/lib/errors";
import type { Result } from "@/types/shared";

/** Authenticate through Credentials; library exceptions stop at this Result boundary. */
export async function createSession(input: unknown): Promise<Result<true>> {
  if (isDemoMode()) return localizeResult(await ok(true as const));
  if (!hasAuthSecret()) return localizeResult(await err("CONFIGURATION", "Для входа задайте AUTH_SECRET в окружении сервера"));
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return localizeResult(await err("VALIDATION", "Введите корректный email и пароль"));
  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
    return localizeResult(await ok(true as const));
  } catch (error: unknown) {
    if (error instanceof AuthError && error.type === "CredentialsSignin") return localizeResult(await err("UNAUTHORIZED", "Не удалось войти. Проверьте данные и доступ к рабочему пространству"));
    return localizeResult(await err("STORAGE", "Сервис входа недоступен. Попробуйте снова"));
  }
}

/** Revoke the exact server registry row through Auth.js and clear its cookies. */
export async function deleteSession(): Promise<Result<true>> {
  if (isDemoMode()) return localizeResult(await ok(true as const));
  try {
    const revoked = await deleteCurrentSession();
    if (!revoked.ok) return localizeResult(await revoked);
    await signOut({ redirect: false });
    return localizeResult(await ok(true as const));
  } catch { return localizeResult(await err("STORAGE", "Не удалось завершить сессию. Повторите попытку")); }
}
