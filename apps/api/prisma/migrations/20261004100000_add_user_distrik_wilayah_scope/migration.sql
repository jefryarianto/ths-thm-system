-- Add per-level scope columns on users so admin_distrik / admin_wilayah can be
-- scoped to their own level instead of being tied to a single ranting.
ALTER TABLE "users" ADD COLUMN "distrik_id" TEXT;
ALTER TABLE "users" ADD COLUMN "wilayah_id" TEXT;

-- Backfill: turunkan ranting lama → wilayah → distrik agar admin_distrik /
-- admin_wilayah yang sebelumnya disimpan lewat satu ranting tetap punya scope.
UPDATE "users" u
SET "wilayah_id" = r."wilayah_id"
FROM "ranting" r
WHERE u."ranting_id" = r."id"
  AND u."role" IN ('admin_distrik', 'admin_wilayah');

UPDATE "users" u
SET "distrik_id" = w."distrik_id"
FROM "wilayah" w
WHERE u."wilayah_id" = w."id"
  AND u."role" = 'admin_distrik';

-- Foreign keys (ON DELETE SET NULL, sesuai relasi ranting_id yang sudah ada).
ALTER TABLE "users" ADD CONSTRAINT "users_distrik_id_fkey" FOREIGN KEY ("distrik_id") REFERENCES "distrik"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_wilayah_id_fkey" FOREIGN KEY ("wilayah_id") REFERENCES "wilayah"("id") ON DELETE SET NULL ON UPDATE CASCADE;
