-- ── Scope distrik untuk preset jabatan ────────────────────────────────
-- distrik_id NULL = global (nasional). Preset jabatan distrik dipakai distrik
-- tersebut dan menggantikan preset global yang bernama sama; NULL dipertahankan
-- agar data existing otomatis menjadi preset global tanpa migrasi data.

ALTER TABLE "jabatan" ADD COLUMN "distrik_id" TEXT;

-- AddForeignKey
ALTER TABLE "jabatan" ADD CONSTRAINT "jabatan_distrik_id_fkey" FOREIGN KEY ("distrik_id") REFERENCES "distrik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "jabatan_distrik_id_idx" ON "jabatan"("distrik_id");

-- Nama & kode jabatan unik per scope (global + per distrik), bukan lagi unik global.
DROP INDEX IF EXISTS "jabatan_nama_key";
CREATE UNIQUE INDEX "jabatan_nama_scope_key" ON "jabatan"("nama", COALESCE("distrik_id", 'GLOBAL'));

DROP INDEX IF EXISTS "jabatan_kode_key";
CREATE UNIQUE INDEX "jabatan_kode_scope_key" ON "jabatan"("kode", COALESCE("distrik_id", 'GLOBAL'));
