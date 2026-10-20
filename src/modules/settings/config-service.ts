import "server-only";
import { Prisma } from "@prisma/client";
import { err, ok } from "@/lib/errors";
import type { Result } from "@/types/shared";
import { configChangeSchema, type ConfigChange, type AppConfiguration } from "./config-schema";
import { withSettingsMutation } from "./access";
/** Validate a bounded PNG locally; never fetch an administrator-supplied remote URL. */
export function isCompanyLogo(value: string | null): boolean {
 if (value === null) return true;
 const data = Buffer.from(value.slice("data:image/png;base64,".length), "base64");
 return data.length >= 33 && data.length <= 262144 && data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && data.toString("ascii",12,16)==="IHDR" && data.readUInt32BE(16)>0 && data.readUInt32BE(16)<=1024 && data.readUInt32BE(20)>0 && data.readUInt32BE(20)<=1024;
}
/** Save one tenant singleton with captured version, live ADMIN+ authorization, and atomic audit. */
export async function updateAppConfiguration(input: ConfigChange): Promise<Result<AppConfiguration>> {
 const parsed = configChangeSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Check the company name, timezone, date format, and notification settings");
 if (!isCompanyLogo(parsed.data.logo)) return err("VALIDATION", "Use a PNG up to 256 KB and 1024 × 1024 pixels");
 return withSettingsMutation(async (tx, session) => {
  const { version, ...data } = parsed.data;
  const before = await tx.settings.findUnique({ where: { workspaceId: session.workspaceId } });
  if ((before?.version ?? 0) !== version) return err("CONFLICT", "Configuration has changed. Reload settings before saving");
  const zone = await tx.$queryRaw<{ name: string }[]>`SELECT name FROM pg_timezone_names WHERE name = ${data.timezone} LIMIT 1`;
  if (!zone.length) return err("VALIDATION", "This timezone is not supported by the database");
  const row = before ? await tx.settings.update({ where: { workspaceId: session.workspaceId, version }, data: { ...data, version: { increment: 1 } } }) : await tx.settings.create({ data: { ...data, workspaceId: session.workspaceId } });
  await tx.workspace.update({ where: { id: session.workspaceId }, data: { name: data.companyName } });
  const snapshot = (value: typeof row) => ({ companyName: value.companyName, logoConfigured: value.logo !== null, currency: value.currency, timezone: value.timezone, dateFormat: value.dateFormat, notifications: value.notifications, version: value.version });
  await tx.auditLog.create({ data: { workspaceId: session.workspaceId, actorId: session.userId, actor: session.name, domain: "settings", action: before ? "updated" : "created", entityType: "Settings", entityId: session.workspaceId, title: "Application configuration", before: before ? snapshot(before) : Prisma.DbNull, after: snapshot(row) } });
  return ok({ ...data, version: row.version });
 });
}
