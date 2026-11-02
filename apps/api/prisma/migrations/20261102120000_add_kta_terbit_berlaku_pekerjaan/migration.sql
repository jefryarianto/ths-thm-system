-- Tambah field data KTA pada tabel anggota:
--  - pekerjaan: profesi/pekerjaan anggota (diisi manual saat generate KTA)
--  - tanggal_terbit: tanggal pertama kali kartu KTA dibuat
--  - tanggal_berlaku_sampai: masa berlaku KTA (3 tahun sejak terbit, dengan
--    kewajiban re-aktivasi setiap 3 bulan)

-- AlterTable
ALTER TABLE "anggota" ADD COLUMN "pekerjaan" TEXT;
ALTER TABLE "anggota" ADD COLUMN "tanggal_terbit" TIMESTAMP(3);
ALTER TABLE "anggota" ADD COLUMN "tanggal_berlaku_sampai" TIMESTAMP(3);
