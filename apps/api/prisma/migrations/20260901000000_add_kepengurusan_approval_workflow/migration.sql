-- AlterTable: Add approval workflow fields to kepengurusan
ALTER TABLE "kepengurusan" ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'approved';
ALTER TABLE "kepengurusan" ADD COLUMN "approved_by" VARCHAR(255);
ALTER TABLE "kepengurusan" ADD COLUMN "approved_at" TIMESTAMP(3);
ALTER TABLE "kepengurusan" ADD COLUMN "rejection_reason" TEXT;

-- CreateIndex
CREATE INDEX "kepengurusan_status_idx" ON "kepengurusan"("status");

-- Existing records are considered approved
UPDATE "kepengurusan" SET "status" = 'approved' WHERE "status" = 'approved';
