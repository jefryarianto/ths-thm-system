-- Create BuktiKeanggotaan table
CREATE TABLE "bukti_keanggotaan" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "klaimId" TEXT NOT NULL,
    "tipe" VARCHAR(255) NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bukti_keanggotaan_pkey" PRIMARY KEY ("id")
);

-- Create DokumenPendukung table
CREATE TABLE "dokumen_pendukung" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "klaimId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "description" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dokumen_pendukung_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "bukti_keanggotaan" ADD CONSTRAINT "bukti_keanggotaan_klaimId_fkey" FOREIGN KEY ("klaimId") REFERENCES "klaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bukti_keanggotaan" ADD CONSTRAINT "bukti_keanggotaan_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dokumen_pendukung" ADD CONSTRAINT "dokumen_pendukung_klaimId_fkey" FOREIGN KEY ("klaimId") REFERENCES "klaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dokumen_pendukung" ADD CONSTRAINT "dokumen_pendukung_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "bukti_keanggotaan_klaimId_idx" ON "bukti_keanggotaan"("klaimId");
CREATE INDEX "dokumen_pendukung_klaimId_idx" ON "dokumen_pendukung"("klaimId");
