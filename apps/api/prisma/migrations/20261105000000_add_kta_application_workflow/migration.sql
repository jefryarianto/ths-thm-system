-- CreateEnum
CREATE TYPE "KtaAppStatus" AS ENUM ('SUBMITTED', 'RANTING_REVIEW', 'WILAYAH_REVIEW', 'DISTRIK_REVIEW', 'NASIONAL_REVIEW', 'APPROVED', 'PAYMENT_SETUP', 'PAYMENT_PENDING', 'PAYMENT_VERIFIED', 'CARD_GENERATING', 'CARD_GENERATED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "KtaAppLevel" AS ENUM ('RANTING', 'WILAYAH', 'DISTRIK', 'NASIONAL', 'MEMBER');

-- CreateEnum
CREATE TYPE "KtaAppAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'FORWARDED', 'SKIPPED', 'PAYMENT_SETUP', 'PAYMENT_VERIFIED', 'CARD_GENERATED', 'CANCELLED', 'SUPERADMIN_BYPASS');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('BELUM_BAYAR', 'MENUNGGU_VERIFIKASI', 'LUNAS', 'DITOLAK');

-- CreateEnum
CREATE TYPE "KtaBatchStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'PARTIAL');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'admin_nasional';

-- CreateTable
CREATE TABLE "kta_applications" (
    "id" TEXT NOT NULL,
    "anggota_id" TEXT NOT NULL,
    "nomor_anggota" TEXT,
    "status" "KtaAppStatus" NOT NULL DEFAULT 'SUBMITTED',
    "biaya" DECIMAL(10,2),
    "rekening_tujuan" TEXT,
    "bukti_bayar_path" TEXT,
    "status_pembayaran" "PaymentStatus" NOT NULL DEFAULT 'BELUM_BAYAR',
    "diterbitkan_oleh" TEXT,
    "diterbitkan_at" TIMESTAMP(3),
    "submitted_by_id" TEXT NOT NULL,
    "submitted_by_role" TEXT NOT NULL,
    "batch_id" TEXT,
    "catatan_admin" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kta_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kta_app_histories" (
    "id" TEXT NOT NULL,
    "kta_application_id" TEXT NOT NULL,
    "level" "KtaAppLevel" NOT NULL,
    "action" "KtaAppAction" NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "catatan" TEXT,
    "is_skipped" BOOLEAN NOT NULL DEFAULT false,
    "skipped_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kta_app_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kta_batches" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "submitted_by_id" TEXT NOT NULL,
    "submitted_by_role" TEXT NOT NULL,
    "scope_level" TEXT NOT NULL,
    "scope_id" TEXT NOT NULL,
    "total_submitted" INTEGER NOT NULL DEFAULT 0,
    "total_approved" INTEGER NOT NULL DEFAULT 0,
    "total_rejected" INTEGER NOT NULL DEFAULT 0,
    "total_generated" INTEGER NOT NULL DEFAULT 0,
    "status" "KtaBatchStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kta_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kta_applications_anggota_id_idx" ON "kta_applications"("anggota_id");

-- CreateIndex
CREATE INDEX "kta_applications_status_idx" ON "kta_applications"("status");

-- CreateIndex
CREATE INDEX "kta_applications_submitted_by_role_idx" ON "kta_applications"("submitted_by_role");

-- CreateIndex
CREATE INDEX "kta_applications_batch_id_idx" ON "kta_applications"("batch_id");

-- CreateIndex
CREATE INDEX "kta_app_histories_kta_application_id_idx" ON "kta_app_histories"("kta_application_id");

-- CreateIndex
CREATE INDEX "kta_batches_submitted_by_id_idx" ON "kta_batches"("submitted_by_id");

-- CreateIndex
CREATE INDEX "kta_batches_scope_level_scope_id_idx" ON "kta_batches"("scope_level", "scope_id");

-- CreateIndex
CREATE INDEX "berita_is_visible_idx" ON "berita"("is_visible");

-- CreateIndex
CREATE INDEX "berita_created_at_idx" ON "berita"("created_at");

-- CreateIndex
CREATE INDEX "berita_tanggal_idx" ON "berita"("tanggal");

-- CreateIndex
CREATE INDEX "calon_anggota_ranting_id_idx" ON "calon_anggota"("ranting_id");

-- CreateIndex
CREATE INDEX "calon_anggota_status_idx" ON "calon_anggota"("status");

-- CreateIndex
CREATE INDEX "calon_anggota_created_at_idx" ON "calon_anggota"("created_at");

-- CreateIndex
CREATE INDEX "donasi_program_is_visible_idx" ON "donasi_program"("is_visible");

-- CreateIndex
CREATE INDEX "donasi_program_created_at_idx" ON "donasi_program"("created_at");

-- CreateIndex
CREATE INDEX "kegiatan_scope_type_scope_id_idx" ON "kegiatan"("scope_type", "scope_id");

-- CreateIndex
CREATE INDEX "kegiatan_status_idx" ON "kegiatan"("status");

-- CreateIndex
CREATE INDEX "kegiatan_created_at_idx" ON "kegiatan"("created_at");

-- CreateIndex
CREATE INDEX "kegiatan_tanggal_mulai_idx" ON "kegiatan"("tanggal_mulai");

-- CreateIndex
CREATE INDEX "sambutan_is_visible_idx" ON "sambutan"("is_visible");

-- CreateIndex
CREATE INDEX "sambutan_created_at_idx" ON "sambutan"("created_at");

-- CreateIndex
CREATE INDEX "sejarah_is_visible_idx" ON "sejarah"("is_visible");

-- CreateIndex
CREATE INDEX "surat_keluar_status_idx" ON "surat_keluar"("status");

-- CreateIndex
CREATE INDEX "surat_keluar_created_at_idx" ON "surat_keluar"("created_at");

-- CreateIndex
CREATE INDEX "surat_keluar_tanggal_surat_idx" ON "surat_keluar"("tanggal_surat");

-- CreateIndex
CREATE INDEX "surat_masuk_status_idx" ON "surat_masuk"("status");

-- CreateIndex
CREATE INDEX "surat_masuk_created_at_idx" ON "surat_masuk"("created_at");

-- CreateIndex
CREATE INDEX "surat_masuk_tanggal_terima_idx" ON "surat_masuk"("tanggal_terima");

-- AddForeignKey
ALTER TABLE "kta_applications" ADD CONSTRAINT "kta_applications_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kta_applications" ADD CONSTRAINT "kta_applications_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "kta_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kta_app_histories" ADD CONSTRAINT "kta_app_histories_kta_application_id_fkey" FOREIGN KEY ("kta_application_id") REFERENCES "kta_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

