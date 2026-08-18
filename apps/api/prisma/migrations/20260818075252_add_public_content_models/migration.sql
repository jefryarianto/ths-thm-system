-- CreateTable
CREATE TABLE "berita" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "ringkasan" TEXT NOT NULL,
    "konten" TEXT NOT NULL,
    "gambar" TEXT,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slug" TEXT NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "berita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "galeri" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "gambar" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "galeri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donasi_program" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "target_dana" DECIMAL(65,30) NOT NULL,
    "terkumpul" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donasi_program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sejarah" (
    "id" TEXT NOT NULL,
    "konten" TEXT NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sejarah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisasi" (
    "id" TEXT NOT NULL,
    "struktur" JSONB NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisasi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "berita_slug_key" ON "berita"("slug");
