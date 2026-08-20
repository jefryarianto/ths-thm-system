-- Backfill no_hp_normalized untuk baris yang ditulis tanpa kolom ini.
-- Jalur yang sebelumnya tidak mengisi kolom: candidates.approve,
-- graduations.validateResult, dan auth.updateProfile. Idempotent — jalankan
-- kembali aman karena hanya menyetel nilai yang berbeda dari hasil normalisasi.

-- 1) Normalisasi dasar: buang semua karakter non-digit.
UPDATE "anggota"
SET "no_hp_normalized" = regexp_replace("no_hp", '\D', '', 'g')
WHERE "no_hp" IS NOT NULL
  AND "no_hp" <> ''
  AND "no_hp_normalized" IS DISTINCT FROM regexp_replace("no_hp", '\D', '', 'g');

-- 2) Ubah prefix 62... → 0... (format internasional tanpa +).
UPDATE "anggota"
SET "no_hp_normalized" = '0' || substring("no_hp_normalized" from 3)
WHERE "no_hp_normalized" LIKE '62%'
  AND length("no_hp_normalized") > 10;

-- 3) Ubah prefix +62... → 0... (jika ada nilai yang masih menyimpan tanda +).
UPDATE "anggota"
SET "no_hp_normalized" = '0' || substring("no_hp_normalized" from 4)
WHERE "no_hp_normalized" LIKE '+62%'
  AND length("no_hp_normalized") > 11;