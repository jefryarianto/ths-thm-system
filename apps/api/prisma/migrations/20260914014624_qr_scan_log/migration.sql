-- CreateTable
CREATE TABLE "qr_scan" (
    "id" TEXT NOT NULL,
    "qr_validation_id" TEXT NOT NULL,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_scan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "qr_scan_qr_validation_id_scanned_at_idx" ON "qr_scan"("qr_validation_id", "scanned_at" DESC);

-- AddForeignKey
ALTER TABLE "qr_scan" ADD CONSTRAINT "qr_scan_qr_validation_id_fkey" FOREIGN KEY ("qr_validation_id") REFERENCES "qr_validation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "card_templates_distrik_is_active_idx" RENAME TO "card_templates_distrik_id_is_active_idx";
