-- AddMissingDueDate
-- Menambahkan kolom `due_date` pada tabel `iuran` yang diperkenalkan di
-- schema Prisma (commit 3eb436df: otomatisasi tagihan iuran + jatuh tempo
-- akhir bulan) tetapi belum memiliki file migrasi. Tanpa kolom ini setiap
-- query yang menyentuh model Iuran gagal dengan Prisma P2022
-- ("The column `iuran.due_date` does not exist in the current database").

ALTER TABLE "iuran" ADD COLUMN "due_date" TIMESTAMP(3);
