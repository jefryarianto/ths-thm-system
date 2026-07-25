-- Add unique constraint on email column for anggota (members) table
-- PostgreSQL allows multiple NULLs in a unique column, so existing
-- records with NULL email won't conflict.
-- First clean up any existing duplicates before adding the constraint.
DO $$
BEGIN
  -- Remove duplicate emails in anggota table, keeping only the most recently created record
  DELETE FROM anggota a1
  USING anggota a2
  WHERE a1.email IS NOT NULL
    AND a1.email = a2.email
    AND a1.id <> a2.id
    AND a1.created_at < a2.created_at;

  -- Remove duplicate emails in calon_anggota table
  DELETE FROM calon_anggota ca1
  USING calon_anggota ca2
  WHERE ca1.email IS NOT NULL
    AND ca1.email = ca2.email
    AND ca1.id <> ca2.id
    AND ca1.created_at < ca2.created_at;
END $$;

-- Create unique index for anggota.email
CREATE UNIQUE INDEX IF NOT EXISTS "anggota_email_key" ON "anggota"("email");

-- Create unique index for calon_anggota.email
CREATE UNIQUE INDEX IF NOT EXISTS "calon_anggota_email_key" ON "calon_anggota"("email");
