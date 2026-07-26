-- Add admin_kegiatan_id to kegiatan
ALTER TABLE "kegiatan" ADD COLUMN "admin_kegiatan_id" TEXT;

-- Add relation
ALTER TABLE "kegiatan" ADD CONSTRAINT "kegiatan_admin_kegiatan_id_fkey" FOREIGN KEY ("admin_kegiatan_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create enum for ujian praktek status
CREATE TYPE "StatusUjianPraktek" AS ENUM ('draft', 'berlangsung', 'selesai', 'dibatalkan');

-- Create ujian_praktek table
CREATE TABLE "ujian_praktek" (
    "id" TEXT NOT NULL,
    "kegiatan_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "tanggal" TIMESTAMP(3),
    "durasi_menit" INTEGER,
    "status" "StatusUjianPraktek" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ujian_praktek_pkey" PRIMARY KEY ("id")
);

-- Create ujian_praktek_penilai table (examiner assignments)
CREATE TABLE "ujian_praktek_penilai" (
    "id" TEXT NOT NULL,
    "ujian_praktek_id" TEXT NOT NULL,
    "penguji_user_id" TEXT NOT NULL,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ujian_praktek_penilai_pkey" PRIMARY KEY ("id")
);

-- Create ujian_praktek_item table (assessment items used)
CREATE TABLE "ujian_praktek_item" (
    "id" TEXT NOT NULL,
    "ujian_praktek_id" TEXT NOT NULL,
    "item_penilaian_id" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ujian_praktek_item_pkey" PRIMARY KEY ("id")
);

-- Add indexes and foreign keys
CREATE INDEX "ujian_praktek_kegiatan_id_idx" ON "ujian_praktek"("kegiatan_id");
ALTER TABLE "ujian_praktek" ADD CONSTRAINT "ujian_praktek_kegiatan_id_fkey" FOREIGN KEY ("kegiatan_id") REFERENCES "kegiatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ujian_praktek_penilai_unique" ON "ujian_praktek_penilai"("ujian_praktek_id", "penguji_user_id");
ALTER TABLE "ujian_praktek_penilai" ADD CONSTRAINT "ujian_praktek_penilai_ujian_praktek_id_fkey" FOREIGN KEY ("ujian_praktek_id") REFERENCES "ujian_praktek"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ujian_praktek_penilai" ADD CONSTRAINT "ujian_praktek_penilai_penguji_user_id_fkey" FOREIGN KEY ("penguji_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ujian_praktek_item_unique" ON "ujian_praktek_item"("ujian_praktek_id", "item_penilaian_id");
CREATE INDEX "ujian_praktek_item_ujian_praktek_id_idx" ON "ujian_praktek_item"("ujian_praktek_id");
ALTER TABLE "ujian_praktek_item" ADD CONSTRAINT "ujian_praktek_item_ujian_praktek_id_fkey" FOREIGN KEY ("ujian_praktek_id") REFERENCES "ujian_praktek"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ujian_praktek_item" ADD CONSTRAINT "ujian_praktek_item_item_penilaian_id_fkey" FOREIGN KEY ("item_penilaian_id") REFERENCES "item_penilaian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add ujian_praktek_id to nilai_pendadaran
ALTER TABLE "nilai_pendadaran" ADD COLUMN "ujian_praktek_id" TEXT;
ALTER TABLE "nilai_pendadaran" ADD CONSTRAINT "nilai_pendadaran_ujian_praktek_id_fkey" FOREIGN KEY ("ujian_praktek_id") REFERENCES "ujian_praktek"("id") ON DELETE SET NULL ON UPDATE CASCADE;
