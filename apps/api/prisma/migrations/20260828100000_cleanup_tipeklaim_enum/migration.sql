-- Clean up old TipeKlaim enum values
-- PostgreSQL doesn't support ALTER TYPE ... DROP VALUE
-- So we recreate the enum type with only the current values
--
-- Old values (from init migration): sertifikat, piagam, kartu_anggota, dokumen_lainnya
-- New values (current schema):      keanggotaan, dokumen

-- Step 1: Update any rows that still use old enum values to a safe default
UPDATE "klaim"
SET "tipe" = 'dokumen'
WHERE "tipe" IN ('sertifikat', 'piagam', 'kartu_anggota', 'dokumen_lainnya');

-- Step 2: Create new enum type with only the desired values
CREATE TYPE "TipeKlaim_new" AS ENUM ('keanggotaan', 'dokumen');

-- Step 3: Alter the column to use the new enum type (via text cast)
ALTER TABLE "klaim"
  ALTER COLUMN "tipe" DROP DEFAULT,
  ALTER COLUMN "tipe" TYPE TEXT USING "tipe"::TEXT;

-- Step 4: Drop the old enum type
DROP TYPE "TipeKlaim";

-- Step 5: Rename new type to original name
ALTER TYPE "TipeKlaim_new" RENAME TO "TipeKlaim";

-- Step 6: Update column to use the new enum type
ALTER TABLE "klaim"
  ALTER COLUMN "tipe" TYPE "TipeKlaim" USING "tipe"::"TipeKlaim";
