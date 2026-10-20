BEGIN;
CREATE TABLE "EmployeeDocumentLink" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "employeeId" TEXT NOT NULL,
  "title" VARCHAR(200) NOT NULL, "url" VARCHAR(2048) NOT NULL, "notes" VARCHAR(2000),
  "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeDocumentLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmployeeDocumentLink_values_check" CHECK (length(btrim(title)) > 0 AND url ~ '^https?://' AND "version" > 0)
);
CREATE UNIQUE INDEX "EmployeeDocumentLink_id_workspaceId_key" ON "EmployeeDocumentLink"("id", "workspaceId");
CREATE INDEX "EmployeeDocumentLink_workspaceId_employeeId_createdAt_id_idx" ON "EmployeeDocumentLink"("workspaceId", "employeeId", "createdAt", "id");
ALTER TABLE "EmployeeDocumentLink" ADD CONSTRAINT "EmployeeDocumentLink_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeDocumentLink" ADD CONSTRAINT "EmployeeDocumentLink_employeeId_workspaceId_fkey" FOREIGN KEY ("employeeId", "workspaceId") REFERENCES "Employee"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LeaveAllowance" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "employeeId" TEXT NOT NULL, "year" INTEGER NOT NULL,
  "days" DECIMAL(6,2) NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeaveAllowance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeaveAllowance_values_check" CHECK ("year" BETWEEN 1900 AND 9999 AND "days" BETWEEN 0 AND 9999 AND "days" = trunc("days") AND "version" > 0)
);
CREATE UNIQUE INDEX "LeaveAllowance_id_workspaceId_key" ON "LeaveAllowance"("id", "workspaceId");
CREATE UNIQUE INDEX "LeaveAllowance_workspaceId_employeeId_year_key" ON "LeaveAllowance"("workspaceId", "employeeId", "year");
ALTER TABLE "LeaveAllowance" ADD CONSTRAINT "LeaveAllowance_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveAllowance" ADD CONSTRAINT "LeaveAllowance_employeeId_workspaceId_fkey" FOREIGN KEY ("employeeId", "workspaceId") REFERENCES "Employee"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
