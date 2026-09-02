CREATE TYPE "KategoriMateri" AS ENUM ('pencak_silat', 'organisasi', 'mental_spiritual', 'rekreasi');

CREATE TABLE "materi_latihan" (
    "id" TEXT NOT NULL,
    "latihan_id" TEXT NOT NULL,
    "kategori" "KategoriMateri" NOT NULL,
    "detail" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materi_latihan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "materi_latihan_latihan_id_idx" ON "materi_latihan"("latihan_id");

ALTER TABLE "materi_latihan" ADD CONSTRAINT "materi_latihan_latihan_id_fkey" FOREIGN KEY ("latihan_id") REFERENCES "latihan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
