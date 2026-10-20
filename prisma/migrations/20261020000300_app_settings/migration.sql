BEGIN;
CREATE TABLE "Settings" (
 "workspaceId" TEXT PRIMARY KEY REFERENCES "Workspace"(id) ON DELETE RESTRICT,
 "companyName" VARCHAR(160) NOT NULL CHECK(char_length(btrim("companyName")) BETWEEN 2 AND 160),
 logo TEXT, currency CHAR(3) NOT NULL DEFAULT 'EUR' CHECK(currency='EUR'),
 timezone VARCHAR(100) NOT NULL DEFAULT 'Europe/Moscow',
 "dateFormat" VARCHAR(32) NOT NULL DEFAULT 'yyyy-MM-dd' CHECK("dateFormat" IN ('yyyy-MM-dd','dd.MM.yyyy','MM/dd/yyyy','MMM d, yyyy')),
 notifications JSONB NOT NULL CHECK(jsonb_typeof(notifications)='object'),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0), "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "Settings" ("workspaceId","companyName",notifications) SELECT id,left(CASE WHEN char_length(btrim(name))>=2 THEN btrim(name) ELSE 'Company' END,160),'{"created":true,"updated":true,"deleted":true,"payment":true}'::jsonb FROM "Workspace";
INSERT INTO "AuditEvent" (id,"workspaceId",actor,domain,action,"entityType","entityId",title,"after","createdAt") SELECT 'settings-bootstrap-20261020-'||"workspaceId","workspaceId",'System migration','settings','created','Settings',"workspaceId",'Application configuration',jsonb_build_object('companyName',"companyName",'currency',currency,'timezone',timezone,'dateFormat',"dateFormat",'notifications',notifications,'version',version),CURRENT_TIMESTAMP FROM "Settings";
COMMIT;
