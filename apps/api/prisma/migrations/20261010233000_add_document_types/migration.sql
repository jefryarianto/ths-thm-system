-- AlterEnum TipeDokumen
-- Menambahkan tipe dokumen baru sesuai Pedoman Administrasi Kesekretariatan (THS-THM No 3 Tahun 2004)

ALTER TYPE "TipeDokumen" ADD VALUE 'sertifikat_tingkatan';
ALTER TYPE "TipeDokumen" ADD VALUE 'sertifikat_pelatih';
ALTER TYPE "TipeDokumen" ADD VALUE 'sertifikat_wasit_dan_juri';
ALTER TYPE "TipeDokumen" ADD VALUE 'sertifikat_penguji';
ALTER TYPE "TipeDokumen" ADD VALUE 'piagam_seroja';
ALTER TYPE "TipeDokumen" ADD VALUE 'piagam_melati';
ALTER TYPE "TipeDokumen" ADD VALUE 'piagam_mawar';
