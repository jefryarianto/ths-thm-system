-- Unique index anggota.email & anggota.nomor_anggota kini kompatibel soft delete:
-- baris yang sudah dihapus (deleted_at terisi) tidak lagi memblokir pemakaian ulang
-- email / nomor anggota yang sama oleh anggota baru.
--
-- Catatan teknik: Prisma 5 tidak mendukung partial index di schema (issue prisma#16658),
-- jadi `@unique` dipertahankan di schema dan index fisiknya diganti partial index
-- BERNAMA SAMA di sini. Prisma mencocokkan index berdasarkan nama, sehingga
-- `migrate diff` / drift detection tidak melihat perbedaan.

-- DropIndex
DROP INDEX "anggota_nomor_anggota_key";

-- DropIndex
DROP INDEX "anggota_email_key";

-- CreateIndex (partial: hanya baris aktif — deleted_at IS NULL — yang wajib unik)
CREATE UNIQUE INDEX "anggota_nomor_anggota_key" ON "anggota"("nomor_anggota") WHERE "deleted_at" IS NULL;

-- CreateIndex (partial: hanya baris aktif — deleted_at IS NULL — yang wajib unik)
CREATE UNIQUE INDEX "anggota_email_key" ON "anggota"("email") WHERE "deleted_at" IS NULL;
