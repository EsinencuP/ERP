"use server";
import { cookies, headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { err, ok } from "@/lib/errors";
import { LOCALE_COOKIE, type Locale } from "./config";
import { localizeResult } from "./server";
import type { Result } from "@/types/shared";

/** Save the signed-in user's browser language without changing workspace data, permissions, or business values. */
export async function updateLanguage(language: Locale): Promise<Result<Locale>> {
  const session = await getSession(); if (!session.ok) return localizeResult(session);
  if (language !== "en" && language !== "ru") return localizeResult(err("VALIDATION", "Choose English or Russian"));
  (await cookies()).set(LOCALE_COOKIE, language, { path: "/", maxAge: 31536000, sameSite: "lax", httpOnly: true, secure: (await headers()).get("x-forwarded-proto") === "https" });
  return ok(language);
}
