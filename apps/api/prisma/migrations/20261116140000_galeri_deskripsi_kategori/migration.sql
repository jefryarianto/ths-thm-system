-- P1 moderasi galeri: metadata wajib saat unggah, tetapi nullable di DB agar
-- baris lama (sebelum fitur ini) tetap valid dan tidak perlu backfill paksa.
ALTER TABLE "galeri" ADD COLUMN "deskripsi" TEXT;
ALTER TABLE "galeri" ADD COLUMN "kategori" TEXT;

CREATE INDEX "galeri_kategori_idx" ON "galeri"("kategori");
