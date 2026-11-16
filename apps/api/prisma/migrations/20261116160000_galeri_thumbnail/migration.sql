-- Thumbnail galeri: file terpisah agar grid publik tidak menarik gambar penuh.
-- Nullable karena baris lama belum punya thumbnail (UI fallback ke gambar utama).
ALTER TABLE "galeri" ADD COLUMN "thumb_key" TEXT;

CREATE UNIQUE INDEX "galeri_thumb_key_key" ON "galeri"("thumb_key");
