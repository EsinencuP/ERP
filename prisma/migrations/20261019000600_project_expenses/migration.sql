BEGIN;
ALTER TABLE "Expense" ADD COLUMN "projectId" TEXT;
CREATE INDEX "Expense_workspaceId_projectId_currency_idx" ON "Expense"("workspaceId", "projectId", "currency");
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_projectId_workspaceId_fkey" FOREIGN KEY ("projectId", "workspaceId") REFERENCES "Project"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
