-- CreateTable
CREATE TABLE "sambutan" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "konten" TEXT NOT NULL,
    "tokoh" TEXT,
    "foto_tokoh" TEXT,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sambutan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jabatan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kode" TEXT,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jabatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kepengurusan" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "jabatan_id" TEXT NOT NULL,
    "periode_id" TEXT NOT NULL,
    "nasional_id" TEXT,
    "distrik_id" TEXT,
    "wilayah_id" TEXT,
    "ranting_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kepengurusan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jabatan_nama_key" ON "jabatan"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "jabatan_kode_key" ON "jabatan"("kode");

-- AddForeignKey
ALTER TABLE "kepengurusan" ADD CONSTRAINT "kepengurusan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kepengurusan" ADD CONSTRAINT "kepengurusan_jabatan_id_fkey" FOREIGN KEY ("jabatan_id") REFERENCES "jabatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kepengurusan" ADD CONSTRAINT "kepengurusan_periode_id_fkey" FOREIGN KEY ("periode_id") REFERENCES "periode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kepengurusan" ADD CONSTRAINT "kepengurusan_nasional_id_fkey" FOREIGN KEY ("nasional_id") REFERENCES "nasional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kepengurusan" ADD CONSTRAINT "kepengurusan_distrik_id_fkey" FOREIGN KEY ("distrik_id") REFERENCES "distrik"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kepengurusan" ADD CONSTRAINT "kepengurusan_wilayah_id_fkey" FOREIGN KEY ("wilayah_id") REFERENCES "wilayah"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kepengurusan" ADD CONSTRAINT "kepengurusan_ranting_id_fkey" FOREIGN KEY ("ranting_id") REFERENCES "ranting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
