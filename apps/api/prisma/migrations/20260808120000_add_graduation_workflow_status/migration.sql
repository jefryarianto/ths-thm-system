-- CreateEnum
CREATE TYPE "StatusPenugasanPenguji" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "StatusValidasiNilai" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "penugasan_penguji" ADD COLUMN "status" "StatusPenugasanPenguji" NOT NULL DEFAULT 'pending',
ADD COLUMN "disetujui_oleh" TEXT,
ADD COLUMN "disetujui_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "nilai_pendadaran" ADD COLUMN "status_validasi" "StatusValidasiNilai" NOT NULL DEFAULT 'pending',
ADD COLUMN "divalidasi_oleh" TEXT,
ADD COLUMN "divalidasi_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "kegiatan" ADD COLUMN "pengajuan_nilai_oleh" TEXT,
ADD COLUMN "pengajuan_nilai_at" TIMESTAMP(3);
