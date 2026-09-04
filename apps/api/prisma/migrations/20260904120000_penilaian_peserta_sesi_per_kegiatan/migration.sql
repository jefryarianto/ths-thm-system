-- Migrasi: Penilaian & Peserta & Sesi Ujian per Pendadaran
-- 1) AspekPenilaian milik kegiatan (kegiatan_id; null = template global)
-- 2) ItemPenilaian unik per aspek (pendadaran berbeda boleh punya kode sama)
-- 3) PesertaPendadaran — keikutsertaan calon anggota per pendadaran
-- 4) SesiUjianPeserta — sesi ujian praktek per peserta (1 sesi, timer server)

-- CreateEnum
CREATE TYPE "SumberPeserta" AS ENUM ('manual', 'import', 'daftar_calon');

-- CreateEnum
CREATE TYPE "StatusSesiUjian" AS ENUM ('belum_mulai', 'berlangsung', 'selesai');

-- DropIndex
DROP INDEX "item_penilaian_kode_item_key";

-- AlterTable
ALTER TABLE "aspek_penilaian" ADD COLUMN     "kegiatan_id" TEXT;

-- CreateTable
CREATE TABLE "peserta_pendadaran" (
    "id" TEXT NOT NULL,
    "kegiatan_id" TEXT NOT NULL,
    "calon_anggota_id" TEXT NOT NULL,
    "sumber" "SumberPeserta" NOT NULL DEFAULT 'manual',
    "diusulkan_oleh" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "peserta_pendadaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesi_ujian_peserta" (
    "id" TEXT NOT NULL,
    "ujian_praktek_id" TEXT NOT NULL,
    "calon_anggota_id" TEXT NOT NULL,
    "durasi_standar_menit" INTEGER NOT NULL DEFAULT 30,
    "tambahan_menit" INTEGER NOT NULL DEFAULT 0,
    "mulai_at" TIMESTAMP(3),
    "selesai_at" TIMESTAMP(3),
    "status" "StatusSesiUjian" NOT NULL DEFAULT 'belum_mulai',
    "diperpanjang_oleh" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sesi_ujian_peserta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "peserta_pendadaran_calon_anggota_id_idx" ON "peserta_pendadaran"("calon_anggota_id");

-- CreateIndex
CREATE UNIQUE INDEX "peserta_pendadaran_kegiatan_id_calon_anggota_id_key" ON "peserta_pendadaran"("kegiatan_id", "calon_anggota_id");

-- CreateIndex
CREATE INDEX "sesi_ujian_peserta_calon_anggota_id_idx" ON "sesi_ujian_peserta"("calon_anggota_id");

-- CreateIndex
CREATE UNIQUE INDEX "sesi_ujian_peserta_ujian_praktek_id_calon_anggota_id_key" ON "sesi_ujian_peserta"("ujian_praktek_id", "calon_anggota_id");

-- CreateIndex
CREATE INDEX "aspek_penilaian_kegiatan_id_idx" ON "aspek_penilaian"("kegiatan_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_penilaian_aspek_kode_item_key" ON "item_penilaian"("aspek_id", "kode_item");

-- AddForeignKey
ALTER TABLE "aspek_penilaian" ADD CONSTRAINT "aspek_penilaian_kegiatan_id_fkey" FOREIGN KEY ("kegiatan_id") REFERENCES "kegiatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peserta_pendadaran" ADD CONSTRAINT "peserta_pendadaran_kegiatan_id_fkey" FOREIGN KEY ("kegiatan_id") REFERENCES "kegiatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peserta_pendadaran" ADD CONSTRAINT "peserta_pendadaran_calon_anggota_id_fkey" FOREIGN KEY ("calon_anggota_id") REFERENCES "calon_anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesi_ujian_peserta" ADD CONSTRAINT "sesi_ujian_peserta_ujian_praktek_id_fkey" FOREIGN KEY ("ujian_praktek_id") REFERENCES "ujian_praktek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesi_ujian_peserta" ADD CONSTRAINT "sesi_ujian_peserta_calon_anggota_id_fkey" FOREIGN KEY ("calon_anggota_id") REFERENCES "calon_anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill best-effort: peserta legacy
-- Model lama menandai peserta hanya via calon_anggota.status='mengikuti_pendadaran'
-- tanpa tautan ke kegiatan. Bila terdapat TEPAT SATU pendadaran terbuka
-- (draft/published), tautkan semua calon legacy ke pendadaran tersebut.
-- Bila ambigu, biarkan — admin mendaftarkan ulang lewat UI (3 jalur tersedia).
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO "peserta_pendadaran" ("id", "kegiatan_id", "calon_anggota_id", "sumber", "created_at", "updated_at")
SELECT gen_random_uuid()::text, k."id", ca."id", 'daftar_calon', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "calon_anggota" ca
CROSS JOIN "kegiatan" k
WHERE ca."status" = 'mengikuti_pendadaran'
  AND k."tipe" = 'pendadaran'
  AND k."status" IN ('draft', 'published')
  AND (
    SELECT COUNT(*)
    FROM "kegiatan" k2
    WHERE k2."tipe" = 'pendadaran' AND k2."status" IN ('draft', 'published')
  ) = 1
ON CONFLICT DO NOTHING;
