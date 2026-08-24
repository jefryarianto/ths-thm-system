-- Add new enum values (safe for existing data)
DO $$ BEGIN
  ALTER TYPE "TipeKlaim" ADD VALUE IF NOT EXISTS 'keanggotaan';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "TipeKlaim" ADD VALUE IF NOT EXISTS 'dokumen';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Make anggota_id optional (drop NOT NULL constraint)
ALTER TABLE "klaim" ALTER COLUMN "anggota_id" DROP NOT NULL;

-- Add new columns
ALTER TABLE "klaim" ADD COLUMN "nama_lengkap" TEXT;
ALTER TABLE "klaim" ADD COLUMN "jenis_kelamin" TEXT;
ALTER TABLE "klaim" ADD COLUMN "tempat_lahir" TEXT;
ALTER TABLE "klaim" ADD COLUMN "tanggal_lahir" TIMESTAMP(3);
ALTER TABLE "klaim" ADD COLUMN "alamat" TEXT;
ALTER TABLE "klaim" ADD COLUMN "no_hp" TEXT;
ALTER TABLE "klaim" ADD COLUMN "email" TEXT;
ALTER TABLE "klaim" ADD COLUMN "ranting_id" TEXT;
ALTER TABLE "klaim" ADD COLUMN "bukti_dokumen" JSONB;
ALTER TABLE "klaim" ADD COLUMN "approved_by" TEXT;
ALTER TABLE "klaim" ADD COLUMN "approved_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "klaim_ranting_id_idx" ON "klaim"("ranting_id");

-- AddForeignKey
ALTER TABLE "klaim" ADD CONSTRAINT "klaim_ranting_id_fkey" FOREIGN KEY ("ranting_id") REFERENCES "ranting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
