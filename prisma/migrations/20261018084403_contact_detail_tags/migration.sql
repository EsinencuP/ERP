BEGIN;

-- Additive migration: existing contacts keep their data and receive an empty tag list.
ALTER TABLE "Contact" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_tags_valid" CHECK (
  "tags" IS NOT NULL AND cardinality("tags") <= 20 AND array_position("tags", NULL) IS NULL
);

COMMIT;
