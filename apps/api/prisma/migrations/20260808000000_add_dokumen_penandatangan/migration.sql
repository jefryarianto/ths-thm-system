-- CreateTable
CREATE TABLE "dokumen_penandatangans" (
    "id" TEXT NOT NULL,
    "dokumen_type" TEXT NOT NULL,
    "penandatangan_id" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dokumen_penandatangans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dokumen_penandatangans_dokumen_type_idx" ON "dokumen_penandatangans"("dokumen_type");

-- CreateIndex
CREATE UNIQUE INDEX "dokumen_penandatangans_dokumen_type_urutan_key" ON "dokumen_penandatangans"("dokumen_type", "urutan");

-- AddForeignKey
ALTER TABLE "dokumen_penandatangans" ADD CONSTRAINT "dokumen_penandatangans_penandatangan_id_fkey" FOREIGN KEY ("penandatangan_id") REFERENCES "penandatangans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
