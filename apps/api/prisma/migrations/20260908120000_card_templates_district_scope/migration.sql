-- ── Scope distrik untuk template kartu anggota ─────────────────────────
-- distrik_id NULL = global (nasional). Template distrik diprioritaskan di atas
-- global saat resolve kartu anggota. NULL dipertahankan agar data existing
-- (template 'classic' seed) otomatis menjadi scope global tanpa migrasi data.

ALTER TABLE "card_templates" ADD COLUMN "distrik_id" TEXT;

-- AddForeignKey
ALTER TABLE "card_templates" ADD CONSTRAINT "card_templates_distrik_id_fkey" FOREIGN KEY ("distrik_id") REFERENCES "distrik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "card_templates_distrik_is_active_idx" ON "card_templates"("distrik_id", "is_active");

-- Nama template unik per scope (global + per distrik), bukan lagi unik global.
DROP INDEX IF EXISTS "card_templates_name_key";
CREATE UNIQUE INDEX "card_templates_name_scope_key" ON "card_templates"("name", COALESCE("distrik_id", 'GLOBAL'));