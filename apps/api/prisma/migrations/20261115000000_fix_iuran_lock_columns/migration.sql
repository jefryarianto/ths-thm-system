-- Fix Iuran lock column names.
--
-- The previous migration (20261113000000_add_dues_lock_fields) created these
-- columns in camelCase, but schema.prisma maps them to snake_case
-- (locked_at, locked_by, lock_reason, lock_expires_at). Prisma therefore
-- queried non-existent columns and failed with P2022, which broke member
-- detail (it includes `iuran: true`) and dues endpoints.
--
-- This migration is idempotent: it renames only when the legacy camelCase
-- column still exists, so it is safe on databases that already match the schema.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'iuran' AND column_name = 'lockedAt'
  ) THEN
    ALTER TABLE "iuran" RENAME COLUMN "lockedAt" TO "locked_at";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'iuran' AND column_name = 'lockedBy'
  ) THEN
    ALTER TABLE "iuran" RENAME COLUMN "lockedBy" TO "locked_by";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'iuran' AND column_name = 'lockReason'
  ) THEN
    ALTER TABLE "iuran" RENAME COLUMN "lockReason" TO "lock_reason";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'iuran' AND column_name = 'lockExpiresAt'
  ) THEN
    ALTER TABLE "iuran" RENAME COLUMN "lockExpiresAt" TO "lock_expires_at";
  END IF;
END $$;

-- Align index name with Prisma's expected convention (safe/no-op if absent).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'iuran_lockedAt_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'iuran_locked_at_idx') THEN
    ALTER INDEX "iuran_lockedAt_idx" RENAME TO "iuran_locked_at_idx";
  END IF;
END $$;
