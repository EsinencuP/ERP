"use server";
import { revalidatePath } from "next/cache";
import { localizeResult } from "@/i18n/server";
import * as queries from "./queries";
import * as service from "./service";
import type { AcceptInviteInput, InviteInput, MemberChange, MemberFilters } from "./types";

function refresh() { try { revalidatePath("/settings"); revalidatePath("/settings/users"); revalidatePath("/settings/audit"); revalidatePath("/"); } catch { console.error("Settings cache revalidation failed after commit"); } }
/** Load a tenant-scoped directory with live administrator authorization. */
export async function getMembers(input: MemberFilters = {}) { return localizeResult(await queries.getMembers(input)); }
/** Load secret-free recent invitations with live administrator authorization. */
export async function getInvitations() { return localizeResult(await queries.getInvitations()); }
/** Load the latest hundred sanitized tenant audit entries for ADMIN+. */
export async function getAuditLog() { return localizeResult(await queries.getAuditLog()); }
/** Update one versioned workspace role/status and invalidate affected screens. */
export async function updateMember(input: MemberChange) { const result = await service.updateMember(input); if (result.ok) refresh(); return localizeResult(result); }
/** Create a private invitation link for the specified email and role. */
export async function createInvitation(input: InviteInput) { const result = await service.createInvitation(input); if (result.ok) refresh(); return localizeResult(result); }
/** Revoke an unused invitation version without deleting its audit history. */
export async function deleteInvitation(input: { id: string; version: number }) { const result = await service.deleteInvitation(input); if (result.ok) refresh(); return localizeResult(result); }
/** Redeem an invitation once, preserving existing account credentials and data. */
export async function createInvitedMembership(input: AcceptInviteInput) { const result = await service.createInvitedMembership(input); if (result.ok) refresh(); return localizeResult(result); }

/** Read the authenticated workspace application configuration. */
export async function getAppConfiguration() { const { getAppConfiguration: read } = await import("./config-queries"); return localizeResult(await read()); }
/** Save ADMIN+ configuration, publish it to the app layout, and preserve the Result boundary. */
export async function updateAppConfiguration(input: import("./config-schema").ConfigChange) { const { updateAppConfiguration: save } = await import("./config-service"); const result = await save(input); if (result.ok) { try { revalidatePath("/", "layout"); } catch { console.error("Configuration cache revalidation failed after commit"); } } return localizeResult(result); }
