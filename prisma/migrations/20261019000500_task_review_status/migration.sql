-- Rename in place: existing tasks and their relationships are preserved.
ALTER TYPE "TaskStatus" RENAME VALUE 'REVIEW' TO 'IN_REVIEW';
