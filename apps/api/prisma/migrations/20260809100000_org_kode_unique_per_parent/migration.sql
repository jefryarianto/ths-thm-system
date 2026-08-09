-- DropIndex (kode unik per parent, bukan global — format NRA LRT-0103-xxx memakai kode ranting yang sama di tiap wilayah)
DROP INDEX IF EXISTS "wilayah_kode_wilayah_key";
DROP INDEX IF EXISTS "ranting_kode_ranting_key";

-- CreateIndex (unique komposit per parent)
CREATE UNIQUE INDEX IF NOT EXISTS "wilayah_distrik_id_kode_wilayah_key" ON "wilayah"("distrik_id", "kode_wilayah");
CREATE UNIQUE INDEX IF NOT EXISTS "ranting_wilayah_id_kode_ranting_key" ON "ranting"("wilayah_id", "kode_ranting");
