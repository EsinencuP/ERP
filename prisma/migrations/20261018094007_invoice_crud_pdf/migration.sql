BEGIN;
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "customerSnapshot" JSONB,
ADD COLUMN     "issuerName" TEXT;

-- CreateTable
CREATE TABLE "InvoiceSequence" (
    "workspaceId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("workspaceId","year")
);

-- AddForeignKey
ALTER TABLE "InvoiceSequence" ADD CONSTRAINT "InvoiceSequence_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InvoiceSequence" ADD CONSTRAINT "InvoiceSequence_values_check" CHECK ("year" BETWEEN 1 AND 9999 AND "value" BETWEEN 0 AND 999999999);
-- Start above existing well-formed yearly numbers; counters are never decremented.
INSERT INTO "InvoiceSequence" ("workspaceId", "year", "value")
SELECT "workspaceId", substring("number" from 5 for 4)::integer,
       max(substring("number" from 10)::integer)
FROM "Invoice" WHERE "number" ~ '^INV-[0-9]{4}-[0-9]{4,9}$'
GROUP BY "workspaceId", substring("number" from 5 for 4)::integer;
COMMIT;
