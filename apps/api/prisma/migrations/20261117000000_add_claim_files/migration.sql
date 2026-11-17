CREATE TABLE IF NOT EXISTS "bukti_keanggotaan" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "klaim_id" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bukti_keanggotaan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "dokumen_pendukung" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "klaim_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "description" TEXT,
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dokumen_pendukung_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'bukti_keanggotaan' AND column_name = 'klaimId')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'bukti_keanggotaan' AND column_name = 'klaim_id') THEN
        ALTER TABLE "bukti_keanggotaan" RENAME COLUMN "klaimId" TO "klaim_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'bukti_keanggotaan' AND column_name = 'filePath')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'bukti_keanggotaan' AND column_name = 'file_path') THEN
        ALTER TABLE "bukti_keanggotaan" RENAME COLUMN "filePath" TO "file_path";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'bukti_keanggotaan' AND column_name = 'fileName')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'bukti_keanggotaan' AND column_name = 'file_name') THEN
        ALTER TABLE "bukti_keanggotaan" RENAME COLUMN "fileName" TO "file_name";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'bukti_keanggotaan' AND column_name = 'mimeType')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'bukti_keanggotaan' AND column_name = 'mime_type') THEN
        ALTER TABLE "bukti_keanggotaan" RENAME COLUMN "mimeType" TO "mime_type";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'bukti_keanggotaan' AND column_name = 'uploadedById')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'bukti_keanggotaan' AND column_name = 'uploaded_by_id') THEN
        ALTER TABLE "bukti_keanggotaan" RENAME COLUMN "uploadedById" TO "uploaded_by_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'bukti_keanggotaan' AND column_name = 'createdAt')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'bukti_keanggotaan' AND column_name = 'created_at') THEN
        ALTER TABLE "bukti_keanggotaan" RENAME COLUMN "createdAt" TO "created_at";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'dokumen_pendukung' AND column_name = 'klaimId')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'dokumen_pendukung' AND column_name = 'klaim_id') THEN
        ALTER TABLE "dokumen_pendukung" RENAME COLUMN "klaimId" TO "klaim_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'dokumen_pendukung' AND column_name = 'filePath')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'dokumen_pendukung' AND column_name = 'file_path') THEN
        ALTER TABLE "dokumen_pendukung" RENAME COLUMN "filePath" TO "file_path";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'dokumen_pendukung' AND column_name = 'fileName')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'dokumen_pendukung' AND column_name = 'file_name') THEN
        ALTER TABLE "dokumen_pendukung" RENAME COLUMN "fileName" TO "file_name";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'dokumen_pendukung' AND column_name = 'mimeType')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'dokumen_pendukung' AND column_name = 'mime_type') THEN
        ALTER TABLE "dokumen_pendukung" RENAME COLUMN "mimeType" TO "mime_type";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'dokumen_pendukung' AND column_name = 'uploadedById')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'dokumen_pendukung' AND column_name = 'uploaded_by_id') THEN
        ALTER TABLE "dokumen_pendukung" RENAME COLUMN "uploadedById" TO "uploaded_by_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'dokumen_pendukung' AND column_name = 'createdAt')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'dokumen_pendukung' AND column_name = 'created_at') THEN
        ALTER TABLE "dokumen_pendukung" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
END $$;

ALTER TABLE "bukti_keanggotaan" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "bukti_keanggotaan" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "bukti_keanggotaan" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "bukti_keanggotaan" ALTER COLUMN "klaim_id" TYPE TEXT USING "klaim_id"::text;
ALTER TABLE "bukti_keanggotaan" ALTER COLUMN "uploaded_by_id" TYPE TEXT USING "uploaded_by_id"::text;

ALTER TABLE "dokumen_pendukung" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "dokumen_pendukung" ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "dokumen_pendukung" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "dokumen_pendukung" ALTER COLUMN "klaim_id" TYPE TEXT USING "klaim_id"::text;
ALTER TABLE "dokumen_pendukung" ALTER COLUMN "uploaded_by_id" TYPE TEXT USING "uploaded_by_id"::text;

ALTER TABLE "bukti_keanggotaan" DROP CONSTRAINT IF EXISTS "bukti_keanggotaan_klaimId_fkey";
ALTER TABLE "bukti_keanggotaan" DROP CONSTRAINT IF EXISTS "bukti_keanggotaan_uploadedById_fkey";
ALTER TABLE "dokumen_pendukung" DROP CONSTRAINT IF EXISTS "dokumen_pendukung_klaimId_fkey";
ALTER TABLE "dokumen_pendukung" DROP CONSTRAINT IF EXISTS "dokumen_pendukung_uploadedById_fkey";
ALTER TABLE "bukti_keanggotaan" DROP CONSTRAINT IF EXISTS "bukti_keanggotaan_klaim_id_fkey";
ALTER TABLE "bukti_keanggotaan" DROP CONSTRAINT IF EXISTS "bukti_keanggotaan_uploaded_by_id_fkey";
ALTER TABLE "dokumen_pendukung" DROP CONSTRAINT IF EXISTS "dokumen_pendukung_klaim_id_fkey";
ALTER TABLE "dokumen_pendukung" DROP CONSTRAINT IF EXISTS "dokumen_pendukung_uploaded_by_id_fkey";

CREATE INDEX IF NOT EXISTS "bukti_keanggotaan_klaim_id_idx" ON "bukti_keanggotaan"("klaim_id");
CREATE INDEX IF NOT EXISTS "dokumen_pendukung_klaim_id_idx" ON "dokumen_pendukung"("klaim_id");

ALTER TABLE "bukti_keanggotaan" ADD CONSTRAINT "bukti_keanggotaan_klaim_id_fkey" FOREIGN KEY ("klaim_id") REFERENCES "klaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bukti_keanggotaan" ADD CONSTRAINT "bukti_keanggotaan_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dokumen_pendukung" ADD CONSTRAINT "dokumen_pendukung_klaim_id_fkey" FOREIGN KEY ("klaim_id") REFERENCES "klaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dokumen_pendukung" ADD CONSTRAINT "dokumen_pendukung_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
