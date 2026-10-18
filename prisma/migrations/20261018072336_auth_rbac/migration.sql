-- Rename the existing value in place: User/Membership rows and defaults survive.
BEGIN;
ALTER TYPE "Role" RENAME VALUE 'VIEWER' TO 'READONLY';
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN' BEFORE 'ADMIN';
ALTER TYPE "Role" ADD VALUE 'AGENT' BEFORE 'READONLY';
COMMIT;
