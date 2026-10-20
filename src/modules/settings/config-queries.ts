import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok } from "@/lib/errors";
import type { Result } from "@/types/shared";
import { appConfigSchema, defaultConfiguration, type AppConfiguration } from "./config-schema";
/** Load the live tenant configuration once per server request, with no database-error fallback. */
export const getAppConfiguration = cache(async (): Promise<Result<AppConfiguration>> => {
 const session = await getSession(); if (!session.ok) return session;
 if (session.data.demo) return ok(defaultConfiguration(session.data.workspaceName));
 try { const row = await db.settings.findUnique({ where: { workspaceId: session.data.workspaceId } });
 if (!row) return ok(defaultConfiguration(session.data.workspaceName));
 const parsed = appConfigSchema.safeParse({ companyName: row.companyName, logo: row.logo, currency: row.currency, timezone: row.timezone, dateFormat: row.dateFormat, notifications: row.notifications });
 return parsed.success ? ok({ ...parsed.data, version: row.version }) : err("STORAGE", "Application configuration is invalid. Contact an administrator");
 } catch { return err("STORAGE", "Application configuration could not be loaded. Check PostgreSQL"); }
});
