BEGIN;
-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('OFFICE', 'SOFTWARE', 'TRAVEL', 'MARKETING', 'EQUIPMENT', 'RENT', 'UTILITIES', 'OTHER');

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT,
    "title" VARCHAR(200) NOT NULL,
    "amount" DECIMAL(20,0) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'RUB',
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "date" DATE NOT NULL,
    "receipt" VARCHAR(2048),
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_workspaceId_date_createdAt_id_idx" ON "Expense"("workspaceId", "date", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Expense_workspaceId_category_date_idx" ON "Expense"("workspaceId", "category", "date");

-- CreateIndex
CREATE INDEX "Expense_workspaceId_createdById_idx" ON "Expense"("workspaceId", "createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_id_workspaceId_key" ON "Expense"("id", "workspaceId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_workspaceId_fkey" FOREIGN KEY ("createdById", "workspaceId") REFERENCES "Membership"("userId", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Business invariants are retained in migrations because PSL cannot express CHECKs.
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_values_check" CHECK (btrim("title") <> '' AND "amount" > 0 AND "version" > 0);
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_currency_check" CHECK ("currency" IN ('RUB', 'USD', 'EUR'));
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_date_check" CHECK ("date" BETWEEN DATE '0001-01-01' AND DATE '9999-12-31');
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_notes_check" CHECK ("notes" IS NULL OR char_length("notes") <= 10000);
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_receipt_check" CHECK ("receipt" IS NULL OR ("receipt" ~ '^https?://[^[:space:]]+$' AND "receipt" !~ '^https?://[^/?#]*@'));
COMMIT;
