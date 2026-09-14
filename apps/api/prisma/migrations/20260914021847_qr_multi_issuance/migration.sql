-- CreateEnum
CREATE TYPE "QrSource" AS ENUM ('digital', 'printed');

-- DropIndex
DROP INDEX "qr_validation_dokumen_id_key";

-- AlterTable
ALTER TABLE "qr_validation" ADD COLUMN     "reason" TEXT,
ADD COLUMN     "source" "QrSource" NOT NULL DEFAULT 'digital',
ADD COLUMN     "verification_url" TEXT;

-- CreateIndex
CREATE INDEX "qr_validation_dokumen_id_idx" ON "qr_validation"("dokumen_id");
