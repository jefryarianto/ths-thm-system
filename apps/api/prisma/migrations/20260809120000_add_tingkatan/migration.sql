-- CreateTable
CREATE TABLE "tingkatan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "strip_count" INTEGER NOT NULL DEFAULT 0,
    "strip_warna" TEXT NOT NULL DEFAULT '#94a3b8',
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tingkatan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tingkatan_nama_key" ON "tingkatan"("nama");

-- CreateIndex
CREATE INDEX "tingkatan_urutan_idx" ON "tingkatan"("urutan");
