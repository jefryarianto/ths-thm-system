-- CreateEnum
CREATE TYPE "StatusUndangan" AS ENUM ('dikirim', 'hadir', 'tidak_hadir');

-- CreateTable
CREATE TABLE "undangan_pendadaran" (
    "id" TEXT NOT NULL,
    "kegiatan_id" TEXT NOT NULL,
    "anggota_id" TEXT NOT NULL,
    "status" "StatusUndangan" NOT NULL DEFAULT 'dikirim',
    "dikirim_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "konfirmasi_at" TIMESTAMP(3),
    "konfirmasi_oleh" TEXT,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "undangan_pendadaran_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "undangan_pendadaran_kegiatan_id_anggota_id_key" ON "undangan_pendadaran"("kegiatan_id", "anggota_id");

-- AddForeignKey
ALTER TABLE "undangan_pendadaran" ADD CONSTRAINT "undangan_pendadaran_kegiatan_id_fkey" FOREIGN KEY ("kegiatan_id") REFERENCES "kegiatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "undangan_pendadaran" ADD CONSTRAINT "undangan_pendadaran_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
