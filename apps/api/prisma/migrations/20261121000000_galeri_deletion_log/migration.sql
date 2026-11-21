-- Log penghapusan galeri: satu baris per penghapusan, tidak pernah ditimpa.
-- Tidak ada foreign key ke `galeri` supaya baris audit tetap ada setelah foto
-- dihapus; kolom snapshot menyimpan judul, pemilik, dan kunci file saat itu.
CREATE TABLE "galeri_deletion_log" (
    "id" TEXT NOT NULL,
    "galeri_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_nama" TEXT,
    "actor_role" TEXT,
    "reason" TEXT,
    "judul" TEXT NOT NULL,
    "uploader_id" TEXT,
    "kategori" TEXT,
    "status" "StatusGaleri" NOT NULL,
    "storage_key" TEXT,
    "thumb_key" TEXT,
    "ukuran_bytes" INTEGER,
    "foto_created_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "galeri_deletion_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "galeri_deletion_log_deleted_at_idx"
  ON "galeri_deletion_log"("deleted_at");

CREATE INDEX "galeri_deletion_log_actor_id_deleted_at_idx"
  ON "galeri_deletion_log"("actor_id", "deleted_at");

CREATE INDEX "galeri_deletion_log_galeri_id_idx"
  ON "galeri_deletion_log"("galeri_id");

-- Sengaja tanpa foreign key ke `users`: FK ON DELETE SET NULL adalah UPDATE
-- internal yang akan ditolak trigger append-only di bawah, sehingga menghapus
-- user bisa gagal. Identitas pelaku disimpan sebagai snapshot (actor_id +
-- actor_nama), jadi log tetap terbaca walau akunnya sudah tidak ada.

-- Append-only: baris audit tidak boleh diubah maupun dihapus.
CREATE OR REPLACE FUNCTION "galeri_deletion_log_append_only"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'galeri_deletion_log bersifat append-only: % tidak diizinkan', TG_OP;
END;
$$;

CREATE TRIGGER "galeri_deletion_log_no_update"
BEFORE UPDATE ON "galeri_deletion_log"
FOR EACH ROW EXECUTE FUNCTION "galeri_deletion_log_append_only"();

CREATE TRIGGER "galeri_deletion_log_no_delete"
BEFORE DELETE ON "galeri_deletion_log"
FOR EACH ROW EXECUTE FUNCTION "galeri_deletion_log_append_only"();
