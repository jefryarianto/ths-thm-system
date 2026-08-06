-- CreateTable
CREATE TABLE "penandatangans" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "penandatangans_pkey" PRIMARY KEY ("id")
);

-- Seed default penandatangan aktif (contoh dari template desain kartu)
INSERT INTO "penandatangans" ("id", "nama", "jabatan", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Yoseph Pehan Betan', 'Koordinator Distrik', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "penandatangans");

-- CreateIndex
CREATE INDEX "penandatangans_is_active_idx" ON "penandatangans"("is_active");

-- Partial unique: hanya satu penandatangan aktif dalam satu waktu
CREATE UNIQUE INDEX "penandatangans_single_active_idx" ON "penandatangans"((is_active)) WHERE is_active;
