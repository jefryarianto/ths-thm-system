CREATE TYPE "StatusGaleri" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "galeri"
  ALTER COLUMN "is_visible" SET DEFAULT false,
  ADD COLUMN "status" "StatusGaleri" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "storage_key" TEXT,
  ADD COLUMN "file_name" TEXT,
  ADD COLUMN "mime_type" TEXT,
  ADD COLUMN "ukuran_bytes" INTEGER,
  ADD COLUMN "uploader_id" TEXT,
  ADD COLUMN "reviewer_id" TEXT,
  ADD COLUMN "rejected_reason" TEXT,
  ADD COLUMN "reviewed_at" TIMESTAMP(3);

UPDATE "galeri" SET "status" = 'APPROVED' WHERE "is_visible" = true;
CREATE UNIQUE INDEX "galeri_storage_key_key" ON "galeri"("storage_key");
CREATE INDEX "galeri_status_is_visible_tanggal_idx" ON "galeri"("status", "is_visible", "tanggal");
CREATE INDEX "galeri_uploader_id_idx" ON "galeri"("uploader_id");
ALTER TABLE "galeri" ADD CONSTRAINT "galeri_uploader_id_fkey"
  FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "galeri" ADD CONSTRAINT "galeri_reviewer_id_fkey"
  FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
