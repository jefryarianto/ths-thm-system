-- Log moderasi galeri: satu baris per keputusan review, tidak pernah ditimpa.
-- Baris `galeri` tetap menyimpan keputusan terakhir; tabel ini menyimpan riwayat.
CREATE TABLE "galeri_moderation_log" (
    "id" TEXT NOT NULL,
    "galeri_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL DEFAULT 'REVIEW',
    "from_status" "StatusGaleri",
    "to_status" "StatusGaleri" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "galeri_moderation_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "galeri_moderation_log_galeri_id_created_at_idx"
  ON "galeri_moderation_log"("galeri_id", "created_at");

ALTER TABLE "galeri_moderation_log" ADD CONSTRAINT "galeri_moderation_log_galeri_id_fkey"
  FOREIGN KEY ("galeri_id") REFERENCES "galeri"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "galeri_moderation_log" ADD CONSTRAINT "galeri_moderation_log_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Append-only: tolak UPDATE pada log. DELETE tetap diizinkan hanya lewat
-- ON DELETE CASCADE saat item galeri benar-benar dihapus.
CREATE OR REPLACE FUNCTION "galeri_moderation_log_append_only"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'galeri_moderation_log bersifat append-only: UPDATE tidak diizinkan';
END;
$$;

CREATE TRIGGER "galeri_moderation_log_no_update"
BEFORE UPDATE ON "galeri_moderation_log"
FOR EACH ROW EXECUTE FUNCTION "galeri_moderation_log_append_only"();
