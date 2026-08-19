-- DropForeignKey
ALTER TABLE "absensi_latihan" DROP CONSTRAINT "absensi_latihan_anggota_id_fkey";

-- DropForeignKey
ALTER TABLE "absensi_latihan" DROP CONSTRAINT "absensi_latihan_latihan_id_fkey";

-- DropForeignKey
ALTER TABLE "anggota" DROP CONSTRAINT "anggota_ranting_id_fkey";

-- DropForeignKey
ALTER TABLE "calon_anggota" DROP CONSTRAINT "calon_anggota_ranting_id_fkey";

-- DropForeignKey
ALTER TABLE "check_ins" DROP CONSTRAINT "check_ins_latihan_id_fkey";

-- DropForeignKey
ALTER TABLE "dokumen" DROP CONSTRAINT "dokumen_anggota_id_fkey";

-- DropForeignKey
ALTER TABLE "evaluasi_latihan" DROP CONSTRAINT "evaluasi_latihan_anggota_id_fkey";

-- DropForeignKey
ALTER TABLE "evaluasi_latihan" DROP CONSTRAINT "evaluasi_latihan_latihan_id_fkey";

-- DropForeignKey
ALTER TABLE "forum_posts" DROP CONSTRAINT "forum_posts_author_id_fkey";

-- DropForeignKey
ALTER TABLE "forum_threads" DROP CONSTRAINT "forum_threads_author_id_fkey";

-- DropForeignKey
ALTER TABLE "hasil_pendadaran" DROP CONSTRAINT "hasil_pendadaran_calon_anggota_id_fkey";

-- DropForeignKey
ALTER TABLE "iuran" DROP CONSTRAINT "iuran_anggota_id_fkey";

-- DropForeignKey
ALTER TABLE "kegiatan_peserta" DROP CONSTRAINT "kegiatan_peserta_anggota_id_fkey";

-- DropForeignKey
ALTER TABLE "kepengurusan" DROP CONSTRAINT "kepengurusan_distrik_id_fkey";

-- DropForeignKey
ALTER TABLE "kepengurusan" DROP CONSTRAINT "kepengurusan_ranting_id_fkey";

-- DropForeignKey
ALTER TABLE "kepengurusan" DROP CONSTRAINT "kepengurusan_wilayah_id_fkey";

-- DropForeignKey
ALTER TABLE "klaim" DROP CONSTRAINT "klaim_anggota_id_fkey";

-- DropForeignKey
ALTER TABLE "latihan" DROP CONSTRAINT "latihan_ranting_id_fkey";

-- DropForeignKey
ALTER TABLE "nilai_pendadaran" DROP CONSTRAINT "nilai_pendadaran_anggota_id_fkey";

-- DropForeignKey
ALTER TABLE "nilai_pendadaran" DROP CONSTRAINT "nilai_pendadaran_calon_anggota_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_transactions" DROP CONSTRAINT "payment_transactions_iuran_id_fkey";

-- DropForeignKey
ALTER TABLE "presensi_kegiatan" DROP CONSTRAINT "presensi_kegiatan_anggota_id_fkey";

-- DropForeignKey
ALTER TABLE "qr_validation" DROP CONSTRAINT "qr_validation_dokumen_id_fkey";

-- DropForeignKey
ALTER TABLE "ranting" DROP CONSTRAINT "ranting_wilayah_id_fkey";

-- DropForeignKey
ALTER TABLE "undangan_pendadaran" DROP CONSTRAINT "undangan_pendadaran_anggota_id_fkey";

-- DropForeignKey
ALTER TABLE "unit_latihan" DROP CONSTRAINT "unit_latihan_distrik_id_fkey";

-- DropForeignKey
ALTER TABLE "wilayah" DROP CONSTRAINT "wilayah_distrik_id_fkey";

-- AddForeignKey
ALTER TABLE "wilayah" ADD CONSTRAINT "wilayah_distrik_id_fkey" FOREIGN KEY ("distrik_id") REFERENCES "distrik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranting" ADD CONSTRAINT "ranting_wilayah_id_fkey" FOREIGN KEY ("wilayah_id") REFERENCES "wilayah"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_latihan" ADD CONSTRAINT "unit_latihan_distrik_id_fkey" FOREIGN KEY ("distrik_id") REFERENCES "distrik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anggota" ADD CONSTRAINT "anggota_ranting_id_fkey" FOREIGN KEY ("ranting_id") REFERENCES "ranting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calon_anggota" ADD CONSTRAINT "calon_anggota_ranting_id_fkey" FOREIGN KEY ("ranting_id") REFERENCES "ranting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "klaim" ADD CONSTRAINT "klaim_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "undangan_pendadaran" ADD CONSTRAINT "undangan_pendadaran_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "latihan" ADD CONSTRAINT "latihan_ranting_id_fkey" FOREIGN KEY ("ranting_id") REFERENCES "ranting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi_latihan" ADD CONSTRAINT "absensi_latihan_latihan_id_fkey" FOREIGN KEY ("latihan_id") REFERENCES "latihan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi_latihan" ADD CONSTRAINT "absensi_latihan_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluasi_latihan" ADD CONSTRAINT "evaluasi_latihan_latihan_id_fkey" FOREIGN KEY ("latihan_id") REFERENCES "latihan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluasi_latihan" ADD CONSTRAINT "evaluasi_latihan_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kegiatan_peserta" ADD CONSTRAINT "kegiatan_peserta_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presensi_kegiatan" ADD CONSTRAINT "presensi_kegiatan_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nilai_pendadaran" ADD CONSTRAINT "nilai_pendadaran_calon_anggota_id_fkey" FOREIGN KEY ("calon_anggota_id") REFERENCES "calon_anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nilai_pendadaran" ADD CONSTRAINT "nilai_pendadaran_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_pendadaran" ADD CONSTRAINT "hasil_pendadaran_calon_anggota_id_fkey" FOREIGN KEY ("calon_anggota_id") REFERENCES "calon_anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokumen" ADD CONSTRAINT "dokumen_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_validation" ADD CONSTRAINT "qr_validation_dokumen_id_fkey" FOREIGN KEY ("dokumen_id") REFERENCES "dokumen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iuran" ADD CONSTRAINT "iuran_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_iuran_id_fkey" FOREIGN KEY ("iuran_id") REFERENCES "iuran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kepengurusan" ADD CONSTRAINT "kepengurusan_distrik_id_fkey" FOREIGN KEY ("distrik_id") REFERENCES "distrik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kepengurusan" ADD CONSTRAINT "kepengurusan_wilayah_id_fkey" FOREIGN KEY ("wilayah_id") REFERENCES "wilayah"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kepengurusan" ADD CONSTRAINT "kepengurusan_ranting_id_fkey" FOREIGN KEY ("ranting_id") REFERENCES "ranting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_latihan_id_fkey" FOREIGN KEY ("latihan_id") REFERENCES "latihan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
