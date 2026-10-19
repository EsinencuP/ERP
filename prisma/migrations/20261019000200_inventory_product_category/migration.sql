BEGIN;
ALTER TABLE "Product" ADD COLUMN "category" VARCHAR(100);
CREATE INDEX "Product_workspaceId_category_idx" ON "Product"("workspaceId", "category");
COMMIT;
