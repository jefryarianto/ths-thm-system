-- Tambah kolom tempat_dadar & tahun_dadar pada tabel klaim.
-- Field ini menampung data pendadaran (dadar) pelapor saat pengajuan klaim
-- keanggotaan, dan akan diteruskan ke anggota saat klaim disetujui.

-- AlterTable
ALTER TABLE "klaim" ADD COLUMN "tempat_dadar" TEXT;
ALTER TABLE "klaim" ADD COLUMN "tahun_dadar" TEXT;
