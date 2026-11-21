-- Riwayat review harus bertahan setelah fotonya dihapus. FK `galeri_id` dengan
-- ON DELETE CASCADE menghapus seluruh riwayat, dan FK `actor_id` dengan
-- ON DELETE SET NULL adalah UPDATE internal yang akan ditolak trigger
-- append-only. Keduanya dilepas; identitas disimpan sebagai snapshot.
--
-- Trigger append-only dimatikan sementara untuk backfill + perubahan skema,
-- lalu dipasang kembali di akhir migrasi.

DROP TRIGGER IF EXISTS "galeri_moderation_log_no_update" ON "galeri_moderation_log";

ALTER TABLE "galeri_moderation_log" ADD COLUMN "judul_foto" TEXT;
ALTER TABLE "galeri_moderation_log" ADD COLUMN "actor_nama" TEXT;

-- Backfill snapshot dari data yang masih ada (best effort).
UPDATE "galeri_moderation_log" AS log
SET "judul_foto" = g."judul"
FROM "galeri" AS g
WHERE log."galeri_id" = g."id" AND log."judul_foto" IS NULL;

UPDATE "galeri_moderation_log" AS log
SET "actor_nama" = u."nama_lengkap"
FROM "users" AS u
WHERE log."actor_id" = u."id" AND log."actor_nama" IS NULL;

ALTER TABLE "galeri_moderation_log" DROP CONSTRAINT IF EXISTS "galeri_moderation_log_galeri_id_fkey";
ALTER TABLE "galeri_moderation_log" DROP CONSTRAINT IF EXISTS "galeri_moderation_log_actor_id_fkey";

CREATE OR REPLACE FUNCTION "galeri_moderation_log_append_only"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'galeri_moderation_log bersifat append-only: % tidak diizinkan', TG_OP;
END;
$$;

CREATE TRIGGER "galeri_moderation_log_no_update"
BEFORE UPDATE ON "galeri_moderation_log"
FOR EACH ROW EXECUTE FUNCTION "galeri_moderation_log_append_only"();

-- Foto tidak lagi dihapus berantai dari tabel ini, jadi DELETE tidak dibutuhkan.
CREATE TRIGGER "galeri_moderation_log_no_delete"
BEFORE DELETE ON "galeri_moderation_log"
FOR EACH ROW EXECUTE FUNCTION "galeri_moderation_log_append_only"();
