-- AlterTable: Add parent_id to kepengurusan for organizational chart hierarchy
-- parent_id defines the reporting relationship (atasan-bawahan)
-- NULL = root node (e.g. Ketua), otherwise references another kepengurusan record
ALTER TABLE "kepengurusan" ADD COLUMN "parent_id" TEXT;

-- CreateIndex
CREATE INDEX "kepengurusan_parent_id_idx" ON "kepengurusan"("parent_id");

-- AddForeignKey
ALTER TABLE "kepengurusan" ADD CONSTRAINT "kepengurusan_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "kepengurusan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
