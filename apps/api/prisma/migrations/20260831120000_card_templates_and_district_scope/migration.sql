-- ── Template Kartu Anggota (desain upload, global) ─────────────────────────

-- CreateTable
CREATE TABLE "card_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "front_image" TEXT,
    "back_image" TEXT,
    "overlay_config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "card_templates_name_key" ON "card_templates"("name");
CREATE INDEX "card_templates_is_active_idx" ON "card_templates"("is_active");

-- Seed template bawaan (desain klasik dari packages/card-design) sebagai satu-satunya aktif
INSERT INTO "card_templates" ("id", "name", "label", "overlay_config", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), 'classic', 'Desain Bawaan (Klasik)', '{}'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "card_templates");

-- ── Scope distrik: penandatangan / tanda tangan / stempel ─────────────────
-- distrik_id NULL = global (nasional). NULL dipertahankan agar data existing
-- otomatis menjadi scope global tanpa migrasi data.

ALTER TABLE "penandatangans" ADD COLUMN "distrik_id" TEXT;
ALTER TABLE "tanda_tangan" ADD COLUMN "distrik_id" TEXT;
ALTER TABLE "stempel" ADD COLUMN "distrik_id" TEXT;
ALTER TABLE "dokumen_penandatangans" ADD COLUMN "distrik_id" TEXT;

-- AddForeignKey
ALTER TABLE "penandatangans" ADD CONSTRAINT "penandatangans_distrik_id_fkey" FOREIGN KEY ("distrik_id") REFERENCES "distrik"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tanda_tangan" ADD CONSTRAINT "tanda_tangan_distrik_id_fkey" FOREIGN KEY ("distrik_id") REFERENCES "distrik"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stempel" ADD CONSTRAINT "stempel_distrik_id_fkey" FOREIGN KEY ("distrik_id") REFERENCES "distrik"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dokumen_penandatangans" ADD CONSTRAINT "dokumen_penandatangans_distrik_id_fkey" FOREIGN KEY ("distrik_id") REFERENCES "distrik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "penandatangans_distrik_is_active_idx" ON "penandatangans"("distrik_id", "is_active");
CREATE INDEX "tanda_tangan_distrik_is_active_idx" ON "tanda_tangan"("distrik_id", "is_active");
CREATE INDEX "stempel_distrik_is_active_idx" ON "stempel"("distrik_id", "is_active");
CREATE INDEX "dokumen_penandatangans_type_scope_idx" ON "dokumen_penandatangans"("dokumen_type", "distrik_id");

-- Single-active penandatangan: dari global → per-scope (satu aktif per distrik + satu global)
DROP INDEX IF EXISTS "penandatangans_single_active_idx";
CREATE UNIQUE INDEX "penandatangans_single_active_scope_idx" ON "penandatangans"(COALESCE("distrik_id", 'GLOBAL')) WHERE "is_active";

-- Penugasan multi-penandatangan: satu set terurut per (tipe dokumen, scope)
DROP INDEX IF EXISTS "dokumen_penandatangans_dokumen_type_urutan_key";
CREATE UNIQUE INDEX "dokumen_penandatangans_scope_urutan_key" ON "dokumen_penandatangans"("dokumen_type", COALESCE("distrik_id", 'GLOBAL'), "urutan");