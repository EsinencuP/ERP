BEGIN;
ALTER TABLE "Membership" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1, ADD COLUMN "lastLoginAt" TIMESTAMPTZ(3);
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_version_check" CHECK (version > 0);
UPDATE "Membership" m SET "lastLoginAt" = s.last_login FROM (SELECT "workspaceId", "userId", MAX("createdAt") last_login FROM "Session" GROUP BY "workspaceId", "userId") s WHERE m."workspaceId" = s."workspaceId" AND m."userId" = s."userId";
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');
CREATE TABLE "WorkspaceInvitation" (
 id TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL, "createdById" TEXT NOT NULL, email VARCHAR(200) NOT NULL, role "Role" NOT NULL,
 "tokenHash" CHAR(64) NOT NULL UNIQUE, status "InvitationStatus" NOT NULL DEFAULT 'PENDING', "expiresAt" TIMESTAMPTZ(3) NOT NULL,
 "acceptedAt" TIMESTAMPTZ(3), version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "WorkspaceInvitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"(id) ON DELETE RESTRICT,
 CONSTRAINT "WorkspaceInvitation_creator_fkey" FOREIGN KEY ("createdById", "workspaceId") REFERENCES "Membership"("userId", "workspaceId") ON DELETE RESTRICT,
 CONSTRAINT "WorkspaceInvitation_email_check" CHECK (email = lower(btrim(email)) AND char_length(email) > 3),
 CONSTRAINT "WorkspaceInvitation_state_check" CHECK ((status = 'ACCEPTED') = ("acceptedAt" IS NOT NULL))
);
CREATE UNIQUE INDEX "WorkspaceInvitation_id_workspaceId_key" ON "WorkspaceInvitation"(id,"workspaceId");
CREATE UNIQUE INDEX "WorkspaceInvitation_pending_email_key" ON "WorkspaceInvitation"("workspaceId",email) WHERE status = 'PENDING';
CREATE INDEX "WorkspaceInvitation_workspaceId_createdAt_id_idx" ON "WorkspaceInvitation"("workspaceId","createdAt",id);
CREATE INDEX "WorkspaceInvitation_workspaceId_email_status_idx" ON "WorkspaceInvitation"("workspaceId",email,status);
COMMIT;
