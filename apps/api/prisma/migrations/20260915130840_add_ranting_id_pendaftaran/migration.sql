-- AlterTable
ALTER TABLE "pendaftaran" ADD COLUMN     "ranting_id" TEXT;

-- CreateIndex
CREATE INDEX "pendaftaran_ranting_id_idx" ON "pendaftaran"("ranting_id");

-- AddForeignKey
ALTER TABLE "pendaftaran" ADD CONSTRAINT "pendaftaran_ranting_id_fkey" FOREIGN KEY ("ranting_id") REFERENCES "ranting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
