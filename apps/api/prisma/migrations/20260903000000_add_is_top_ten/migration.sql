-- AlterTable: Add isTopTen to HasilPendadaran + unique constraint
ALTER TABLE "hasil_pendadaran" ADD COLUMN "is_top_ten" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: Replace index with unique
CREATE UNIQUE INDEX "hasil_pendadaran_kegiatan_id_calon_anggota_id_key" ON "hasil_pendadaran"("kegiatan_id", "calon_anggota_id");
DROP INDEX IF EXISTS "hasil_pendadaran_kegiatan_id_calon_anggota_id_idx";
