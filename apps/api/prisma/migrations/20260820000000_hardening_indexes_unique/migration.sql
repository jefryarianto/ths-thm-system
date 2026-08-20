-- Hardening: index FK, unique constraints, dan presisi Decimal

-- ── Dedupe data sebelum menambah unique constraint ──
-- Keep baris dengan id terkecil (deterministik) untuk tiap pasangan unik.

-- AbsensiLatihan
DELETE FROM "absensi_latihan" a
USING "absensi_latihan" b
WHERE a.id > b.id
  AND a.latihan_id = b.latihan_id
  AND a.anggota_id = b.anggota_id;

-- KegiatanPeserta
DELETE FROM "kegiatan_peserta" a
USING "kegiatan_peserta" b
WHERE a.id > b.id
  AND a.kegiatan_id = b.kegiatan_id
  AND a.anggota_id = b.anggota_id;

-- PresensiKegiatan
DELETE FROM "presensi_kegiatan" a
USING "presensi_kegiatan" b
WHERE a.id > b.id
  AND a.kegiatan_id = b.kegiatan_id
  AND a.anggota_id = b.anggota_id;

-- ── Anggota: kolom no_hp_normalized + backfill ──
ALTER TABLE "anggota" ADD COLUMN "no_hp_normalized" TEXT;

UPDATE "anggota"
SET "no_hp_normalized" = regexp_replace("no_hp", '\D', '', 'g')
WHERE "no_hp" IS NOT NULL AND "no_hp" <> '';

UPDATE "anggota"
SET "no_hp_normalized" = '0' || substring("no_hp_normalized" from 3)
WHERE "no_hp_normalized" LIKE '62%' AND length("no_hp_normalized") > 10;

UPDATE "anggota"
SET "no_hp_normalized" = '0' || substring("no_hp_normalized" from 4)
WHERE "no_hp_normalized" LIKE '+62%' AND length("no_hp_normalized") > 11;

-- ── Unique constraints ──
CREATE UNIQUE INDEX "absensi_latihan_latihan_id_anggota_id_key" ON "absensi_latihan"("latihan_id", "anggota_id");
CREATE UNIQUE INDEX "kegiatan_peserta_kegiatan_id_anggota_id_key" ON "kegiatan_peserta"("kegiatan_id", "anggota_id");
CREATE UNIQUE INDEX "presensi_kegiatan_kegiatan_id_anggota_id_key" ON "presensi_kegiatan"("kegiatan_id", "anggota_id");

-- ── Index FK / hot query columns ──
CREATE INDEX "anggota_no_hp_normalized_idx" ON "anggota"("no_hp_normalized");
CREATE INDEX "notifikasi_user_id_is_read_idx" ON "notifikasi"("user_id", "is_read");
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");
CREATE INDEX "klaim_anggota_id_idx" ON "klaim"("anggota_id");
CREATE INDEX "dokumen_anggota_id_idx" ON "dokumen"("anggota_id");
CREATE INDEX "nilai_pendadaran_kegiatan_id_calon_anggota_id_idx" ON "nilai_pendadaran"("kegiatan_id", "calon_anggota_id");
CREATE INDEX "nilai_pendadaran_penguji_user_id_idx" ON "nilai_pendadaran"("penguji_user_id");
CREATE INDEX "nilai_pendadaran_item_penilaian_id_idx" ON "nilai_pendadaran"("item_penilaian_id");
CREATE INDEX "hasil_pendadaran_kegiatan_id_calon_anggota_id_idx" ON "hasil_pendadaran"("kegiatan_id", "calon_anggota_id");
CREATE INDEX "absensi_latihan_anggota_id_idx" ON "absensi_latihan"("anggota_id");
CREATE INDEX "evaluasi_latihan_latihan_id_idx" ON "evaluasi_latihan"("latihan_id");
CREATE INDEX "evaluasi_latihan_anggota_id_idx" ON "evaluasi_latihan"("anggota_id");
CREATE INDEX "kegiatan_peserta_anggota_id_idx" ON "kegiatan_peserta"("anggota_id");
CREATE INDEX "presensi_kegiatan_anggota_id_idx" ON "presensi_kegiatan"("anggota_id");
CREATE INDEX "disposisi_surat_masuk_id_idx" ON "disposisi"("surat_masuk_id");
CREATE INDEX "latihan_ranting_id_idx" ON "latihan"("ranting_id");
CREATE INDEX "pendaftaran_status_idx" ON "pendaftaran"("status");
CREATE INDEX "pendaftaran_created_at_idx" ON "pendaftaran"("created_at");
CREATE INDEX "iuran_anggota_id_idx" ON "iuran"("anggota_id");

-- ── Presisi Decimal (uang & nilai) ──
ALTER TABLE "iuran" ALTER COLUMN "jumlah" SET DATA TYPE DECIMAL(10,2);
ALTER TABLE "payment_transactions" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);
ALTER TABLE "nilai_pendadaran" ALTER COLUMN "skor" SET DATA TYPE DECIMAL(5,2);
ALTER TABLE "hasil_pendadaran" ALTER COLUMN "total_skor" SET DATA TYPE DECIMAL(5,2);
ALTER TABLE "evaluasi_latihan" ALTER COLUMN "nilai" SET DATA TYPE DECIMAL(5,2);