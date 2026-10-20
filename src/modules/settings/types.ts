import type { z } from "zod";
import type { Role } from "@/types/shared";
import type { memberChangeSchema, memberFiltersSchema, inviteSchema, acceptInviteSchema } from "./schema";

export type MemberFilters = z.input<typeof memberFiltersSchema>;
export type MemberChange = z.infer<typeof memberChangeSchema>;
export type InviteInput = z.input<typeof inviteSchema>;
export type AcceptInviteInput = z.input<typeof acceptInviteSchema>;
export type WorkspaceMember = { userId: string; name: string; email: string; avatar: string | null; role: Role; isActive: boolean; accountActive: boolean; version: number; lastLoginAt: string | null };
export type Invitation = { id: string; email: string; role: Role; status: "PENDING" | "ACCEPTED" | "REVOKED"; expiresAt: string; createdAt: string; version: number };
export type InvitationPreview = { email: string; role: Role; workspaceName: string; existingAccount: boolean; expiresAt: string };
export type AuditEntry = { id: string; actor: string; domain: string; action: string; title: string; entityType: string | null; createdAt: string; before: unknown; after: unknown };
