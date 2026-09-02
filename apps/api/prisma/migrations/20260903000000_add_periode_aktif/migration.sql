-- Menentukan periode aktif per unit (nasional/distrik/wilayah/ranting).
-- Satu unit hanya punya satu periode aktif; unit berbeda boleh aktif bersamaan.

CREATE TABLE "periode_aktif" (
    "id" TEXT NOT NULL,
    "periode_id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "periode_aktif_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "periode_aktif_periode_id_idx" ON "periode_aktif"("periode_id");

CREATE UNIQUE INDEX "periode_aktif_level_unit_id_key" ON "periode_aktif"("level", "unit_id");

ALTER TABLE "periode_aktif" ADD CONSTRAINT "periode_aktif_periode_id_fkey" FOREIGN KEY ("periode_id") REFERENCES "periode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
