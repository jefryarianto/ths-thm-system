-- CreateEnum
CREATE TYPE "TipeUnitLatihan" AS ENUM ('reguler', 'khusus');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota');

-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('L', 'P');

-- CreateEnum
CREATE TYPE "StatusKeanggotaan" AS ENUM ('aktif', 'nonaktif', 'pindah', 'keluar', 'meninggal');

-- CreateEnum
CREATE TYPE "StatusData" AS ENUM ('complete', 'incomplete');

-- CreateEnum
CREATE TYPE "StatusValidasi" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "StatusCalon" AS ENUM ('diusulkan', 'mengikuti_pendadaran', 'lulus', 'gagal', 'dibatalkan');

-- CreateEnum
CREATE TYPE "TipeKlaim" AS ENUM ('sertifikat', 'piagam', 'kartu_anggota', 'dokumen_lainnya');

-- CreateEnum
CREATE TYPE "StatusKlaim" AS ENUM ('pending', 'diproses', 'disetujui', 'ditolak');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('nasional', 'distrik', 'wilayah', 'ranting', 'unit_latihan');

-- CreateEnum
CREATE TYPE "TipeKegiatan" AS ENUM ('latihan', 'pendadaran', 'ujian_tingkat', 'rapat', 'retret', 'pelantikan', 'lainnya');

-- CreateEnum
CREATE TYPE "StatusKegiatan" AS ENUM ('draft', 'published', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "StatusKelulusan" AS ENUM ('lulus', 'gagal');

-- CreateEnum
CREATE TYPE "TipeDokumen" AS ENUM ('kartu_anggota', 'sertifikat_pendadaran', 'sertifikat_pelatihan', 'piagam_prestasi');

-- CreateEnum
CREATE TYPE "StatusDokumen" AS ENUM ('generated', 'downloaded', 'revoked');

-- CreateEnum
CREATE TYPE "StatusSurat" AS ENUM ('draft', 'diterima', 'diproses', 'terkirim', 'diarsipkan');

-- CreateEnum
CREATE TYPE "StatusDisposisi" AS ENUM ('pending', 'dibaca', 'ditindaklanjuti');

-- CreateEnum
CREATE TYPE "MetodeBayar" AS ENUM ('manual', 'transfer', 'online');

-- CreateEnum
CREATE TYPE "StatusIuran" AS ENUM ('belum_dibayar', 'menunggu_verifikasi', 'lunas', 'menunggak');

-- CreateEnum
CREATE TYPE "TipeNotifikasi" AS ENUM ('welcome', 'data_incomplete', 'reminder_latihan', 'reminder_pendadaran', 'reminder_iuran', 'status_klaim', 'dokumen_ready', 'umum');

-- CreateTable
CREATE TABLE "nasional" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nasional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distrik" (
    "id" TEXT NOT NULL,
    "nasional_id" TEXT NOT NULL,
    "kode_distrik" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "alamat" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distrik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wilayah" (
    "id" TEXT NOT NULL,
    "distrik_id" TEXT NOT NULL,
    "kode_wilayah" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wilayah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranting" (
    "id" TEXT NOT NULL,
    "wilayah_id" TEXT NOT NULL,
    "kode_ranting" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "lokasi_latihan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ranting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_latihan" (
    "id" TEXT NOT NULL,
    "distrik_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tipe" "TipeUnitLatihan" NOT NULL,
    "lokasi" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_latihan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nama_lengkap" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'anggota',
    "ranting_id" TEXT,
    "fcm_token" TEXT,
    "refresh_token" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anggota" (
    "id" TEXT NOT NULL,
    "ranting_id" TEXT NOT NULL,
    "nomor_anggota" TEXT NOT NULL,
    "nama_lengkap" TEXT NOT NULL,
    "jenis_kelamin" "JenisKelamin" NOT NULL,
    "tempat_lahir" TEXT,
    "tanggal_lahir" TIMESTAMP(3),
    "alamat" TEXT,
    "no_hp" TEXT,
    "email" TEXT,
    "foto_path" TEXT,
    "status_keanggotaan" "StatusKeanggotaan" NOT NULL DEFAULT 'aktif',
    "tingkat" TEXT,
    "status_data" "StatusData" NOT NULL DEFAULT 'complete',
    "status_validasi" "StatusValidasi" NOT NULL DEFAULT 'pending',
    "missing_fields" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "anggota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calon_anggota" (
    "id" TEXT NOT NULL,
    "ranting_id" TEXT NOT NULL,
    "nama_lengkap" TEXT NOT NULL,
    "jenis_kelamin" "JenisKelamin" NOT NULL,
    "tempat_lahir" TEXT,
    "tanggal_lahir" TIMESTAMP(3),
    "alamat" TEXT,
    "no_hp" TEXT,
    "email" TEXT,
    "status" "StatusCalon" NOT NULL DEFAULT 'diusulkan',
    "usul_oleh_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calon_anggota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pendaftaran" (
    "id" TEXT NOT NULL,
    "nama_lengkap" TEXT NOT NULL,
    "jenis_kelamin" "JenisKelamin" NOT NULL,
    "tempat_lahir" TEXT,
    "tanggal_lahir" TIMESTAMP(3),
    "alamat" TEXT,
    "no_hp" TEXT,
    "email" TEXT,
    "sumber_info" TEXT,
    "status" "StatusValidasi" NOT NULL DEFAULT 'pending',
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pendaftaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "klaim" (
    "id" TEXT NOT NULL,
    "anggota_id" TEXT NOT NULL,
    "tipe" "TipeKlaim" NOT NULL,
    "status" "StatusKlaim" NOT NULL DEFAULT 'pending',
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "klaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kegiatan" (
    "id" TEXT NOT NULL,
    "scope_type" "ScopeType" NOT NULL,
    "scope_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tipe" "TipeKegiatan" NOT NULL,
    "lokasi" TEXT,
    "tanggal_mulai" TIMESTAMP(3) NOT NULL,
    "tanggal_selesai" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "status" "StatusKegiatan" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "latihan" (
    "id" TEXT NOT NULL,
    "ranting_id" TEXT NOT NULL,
    "kegiatan_id" TEXT,
    "pelatih_id" TEXT NOT NULL,
    "hari_tanggal" TIMESTAMP(3) NOT NULL,
    "lokasi" TEXT,
    "jenis_materi" TEXT,
    "hasil_latihan_global" TEXT,
    "rekomendasi_latihan_berikutnya" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "latihan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absensi_latihan" (
    "id" TEXT NOT NULL,
    "latihan_id" TEXT NOT NULL,
    "anggota_id" TEXT NOT NULL,
    "hadir" BOOLEAN NOT NULL DEFAULT true,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "absensi_latihan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluasi_latihan" (
    "id" TEXT NOT NULL,
    "latihan_id" TEXT NOT NULL,
    "anggota_id" TEXT NOT NULL,
    "nilai" DECIMAL(65,30) NOT NULL,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluasi_latihan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kegiatan_peserta" (
    "id" TEXT NOT NULL,
    "kegiatan_id" TEXT NOT NULL,
    "anggota_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kegiatan_peserta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presensi_kegiatan" (
    "id" TEXT NOT NULL,
    "kegiatan_id" TEXT NOT NULL,
    "anggota_id" TEXT NOT NULL,
    "hadir" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presensi_kegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dokumen_kegiatan" (
    "id" TEXT NOT NULL,
    "kegiatan_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "file_path" TEXT,
    "tipe" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dokumen_kegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aspek_penilaian" (
    "id" TEXT NOT NULL,
    "kode_aspek" TEXT NOT NULL,
    "nama_aspek" TEXT NOT NULL,
    "deskripsi" TEXT,
    "bobot" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aspek_penilaian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penugasan_penguji" (
    "id" TEXT NOT NULL,
    "penguji_user_id" TEXT NOT NULL,
    "kegiatan_id" TEXT NOT NULL,
    "peran" TEXT DEFAULT 'penguji',
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "penugasan_penguji_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_penilaian" (
    "id" TEXT NOT NULL,
    "aspek_id" TEXT NOT NULL,
    "kode_item" TEXT NOT NULL,
    "nama_item" TEXT NOT NULL,
    "skor_maksimal" DECIMAL(65,30) NOT NULL DEFAULT 100,
    "bobot" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "urutan" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_penilaian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nilai_pendadaran" (
    "id" TEXT NOT NULL,
    "kegiatan_id" TEXT NOT NULL,
    "calon_anggota_id" TEXT NOT NULL,
    "anggota_id" TEXT,
    "item_penilaian_id" TEXT NOT NULL,
    "penguji_user_id" TEXT NOT NULL,
    "skor" DECIMAL(65,30) NOT NULL,
    "komentar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nilai_pendadaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hasil_pendadaran" (
    "id" TEXT NOT NULL,
    "kegiatan_id" TEXT NOT NULL,
    "calon_anggota_id" TEXT NOT NULL,
    "total_skor" DECIMAL(65,30) NOT NULL,
    "ranking" INTEGER,
    "status_kelulusan" "StatusKelulusan" NOT NULL,
    "status_validasi" "StatusValidasi" NOT NULL DEFAULT 'pending',
    "divalidasi_oleh" TEXT,
    "divalidasi_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hasil_pendadaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dokumen" (
    "id" TEXT NOT NULL,
    "anggota_id" TEXT NOT NULL,
    "tipe" "TipeDokumen" NOT NULL,
    "nomor_dokumen" TEXT NOT NULL,
    "file_path" TEXT,
    "verification_url" TEXT,
    "signature_id" TEXT,
    "stamp_id" TEXT,
    "status" "StatusDokumen" NOT NULL DEFAULT 'generated',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dokumen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_validation" (
    "id" TEXT NOT NULL,
    "dokumen_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "scanned_at" TIMESTAMP(3),
    "scan_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_validation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tanda_tangan" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL,
    "image_path" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tanda_tangan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stempel" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "image_path" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stempel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dokumen_organisasi" (
    "id" TEXT NOT NULL,
    "kategori_id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT,
    "file_path" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dokumen_organisasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kategori_dokumen" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kategori_dokumen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surat_masuk" (
    "id" TEXT NOT NULL,
    "nomor_surat" TEXT NOT NULL,
    "tanggal_surat" TIMESTAMP(3) NOT NULL,
    "tanggal_terima" TIMESTAMP(3) NOT NULL,
    "pengirim" TEXT NOT NULL,
    "perihal" TEXT NOT NULL,
    "file_scan_path" TEXT,
    "status" "StatusSurat" NOT NULL DEFAULT 'diterima',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surat_masuk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surat_keluar" (
    "id" TEXT NOT NULL,
    "nomor_surat" TEXT NOT NULL,
    "tanggal_surat" TIMESTAMP(3) NOT NULL,
    "tujuan" TEXT NOT NULL,
    "perihal" TEXT NOT NULL,
    "isi" TEXT,
    "file_path" TEXT,
    "status" "StatusSurat" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surat_keluar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disposisi" (
    "id" TEXT NOT NULL,
    "surat_masuk_id" TEXT NOT NULL,
    "dari_user_id" TEXT NOT NULL,
    "kepada_user_id" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "status" "StatusDisposisi" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disposisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iuran" (
    "id" TEXT NOT NULL,
    "anggota_id" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "jumlah" DECIMAL(65,30) NOT NULL,
    "tanggal_bayar" TIMESTAMP(3),
    "metode_bayar" "MetodeBayar" NOT NULL DEFAULT 'manual',
    "status" "StatusIuran" NOT NULL DEFAULT 'belum_dibayar',
    "bukti_bayar_path" TEXT,
    "diverifikasi_oleh" TEXT,
    "diverifikasi_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iuran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifikasi" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "tipe" "TipeNotifikasi" NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifikasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'android',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periode" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tgl_mulai" TIMESTAMP(3) NOT NULL,
    "tgl_selesai" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nasional_kode_key" ON "nasional"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "distrik_kode_distrik_key" ON "distrik"("kode_distrik");

-- CreateIndex
CREATE UNIQUE INDEX "wilayah_kode_wilayah_key" ON "wilayah"("kode_wilayah");

-- CreateIndex
CREATE UNIQUE INDEX "ranting_kode_ranting_key" ON "ranting"("kode_ranting");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "anggota_nomor_anggota_key" ON "anggota"("nomor_anggota");

-- CreateIndex
CREATE UNIQUE INDEX "aspek_penilaian_kode_aspek_key" ON "aspek_penilaian"("kode_aspek");

-- CreateIndex
CREATE UNIQUE INDEX "item_penilaian_kode_item_key" ON "item_penilaian"("kode_item");

-- CreateIndex
CREATE UNIQUE INDEX "dokumen_nomor_dokumen_key" ON "dokumen"("nomor_dokumen");

-- CreateIndex
CREATE UNIQUE INDEX "qr_validation_dokumen_id_key" ON "qr_validation"("dokumen_id");

-- CreateIndex
CREATE UNIQUE INDEX "qr_validation_token_key" ON "qr_validation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- AddForeignKey
ALTER TABLE "distrik" ADD CONSTRAINT "distrik_nasional_id_fkey" FOREIGN KEY ("nasional_id") REFERENCES "nasional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wilayah" ADD CONSTRAINT "wilayah_distrik_id_fkey" FOREIGN KEY ("distrik_id") REFERENCES "distrik"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranting" ADD CONSTRAINT "ranting_wilayah_id_fkey" FOREIGN KEY ("wilayah_id") REFERENCES "wilayah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_latihan" ADD CONSTRAINT "unit_latihan_distrik_id_fkey" FOREIGN KEY ("distrik_id") REFERENCES "distrik"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_ranting_id_fkey" FOREIGN KEY ("ranting_id") REFERENCES "ranting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anggota" ADD CONSTRAINT "anggota_ranting_id_fkey" FOREIGN KEY ("ranting_id") REFERENCES "ranting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calon_anggota" ADD CONSTRAINT "calon_anggota_ranting_id_fkey" FOREIGN KEY ("ranting_id") REFERENCES "ranting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calon_anggota" ADD CONSTRAINT "calon_anggota_usul_oleh_user_id_fkey" FOREIGN KEY ("usul_oleh_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "klaim" ADD CONSTRAINT "klaim_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kegiatan" ADD CONSTRAINT "kegiatan_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "latihan" ADD CONSTRAINT "latihan_ranting_id_fkey" FOREIGN KEY ("ranting_id") REFERENCES "ranting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "latihan" ADD CONSTRAINT "latihan_kegiatan_id_fkey" FOREIGN KEY ("kegiatan_id") REFERENCES "kegiatan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "latihan" ADD CONSTRAINT "latihan_pelatih_id_fkey" FOREIGN KEY ("pelatih_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi_latihan" ADD CONSTRAINT "absensi_latihan_latihan_id_fkey" FOREIGN KEY ("latihan_id") REFERENCES "latihan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi_latihan" ADD CONSTRAINT "absensi_latihan_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluasi_latihan" ADD CONSTRAINT "evaluasi_latihan_latihan_id_fkey" FOREIGN KEY ("latihan_id") REFERENCES "latihan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluasi_latihan" ADD CONSTRAINT "evaluasi_latihan_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kegiatan_peserta" ADD CONSTRAINT "kegiatan_peserta_kegiatan_id_fkey" FOREIGN KEY ("kegiatan_id") REFERENCES "kegiatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kegiatan_peserta" ADD CONSTRAINT "kegiatan_peserta_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presensi_kegiatan" ADD CONSTRAINT "presensi_kegiatan_kegiatan_id_fkey" FOREIGN KEY ("kegiatan_id") REFERENCES "kegiatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presensi_kegiatan" ADD CONSTRAINT "presensi_kegiatan_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokumen_kegiatan" ADD CONSTRAINT "dokumen_kegiatan_kegiatan_id_fkey" FOREIGN KEY ("kegiatan_id") REFERENCES "kegiatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penugasan_penguji" ADD CONSTRAINT "penugasan_penguji_penguji_user_id_fkey" FOREIGN KEY ("penguji_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penugasan_penguji" ADD CONSTRAINT "penugasan_penguji_kegiatan_id_fkey" FOREIGN KEY ("kegiatan_id") REFERENCES "kegiatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_penilaian" ADD CONSTRAINT "item_penilaian_aspek_id_fkey" FOREIGN KEY ("aspek_id") REFERENCES "aspek_penilaian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nilai_pendadaran" ADD CONSTRAINT "nilai_pendadaran_kegiatan_id_fkey" FOREIGN KEY ("kegiatan_id") REFERENCES "kegiatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nilai_pendadaran" ADD CONSTRAINT "nilai_pendadaran_calon_anggota_id_fkey" FOREIGN KEY ("calon_anggota_id") REFERENCES "calon_anggota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nilai_pendadaran" ADD CONSTRAINT "nilai_pendadaran_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nilai_pendadaran" ADD CONSTRAINT "nilai_pendadaran_item_penilaian_id_fkey" FOREIGN KEY ("item_penilaian_id") REFERENCES "item_penilaian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nilai_pendadaran" ADD CONSTRAINT "nilai_pendadaran_penguji_user_id_fkey" FOREIGN KEY ("penguji_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_pendadaran" ADD CONSTRAINT "hasil_pendadaran_kegiatan_id_fkey" FOREIGN KEY ("kegiatan_id") REFERENCES "kegiatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_pendadaran" ADD CONSTRAINT "hasil_pendadaran_calon_anggota_id_fkey" FOREIGN KEY ("calon_anggota_id") REFERENCES "calon_anggota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_pendadaran" ADD CONSTRAINT "hasil_pendadaran_divalidasi_oleh_fkey" FOREIGN KEY ("divalidasi_oleh") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokumen" ADD CONSTRAINT "dokumen_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_validation" ADD CONSTRAINT "qr_validation_dokumen_id_fkey" FOREIGN KEY ("dokumen_id") REFERENCES "dokumen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tanda_tangan" ADD CONSTRAINT "tanda_tangan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokumen_organisasi" ADD CONSTRAINT "dokumen_organisasi_kategori_id_fkey" FOREIGN KEY ("kategori_id") REFERENCES "kategori_dokumen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokumen_organisasi" ADD CONSTRAINT "dokumen_organisasi_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposisi" ADD CONSTRAINT "disposisi_surat_masuk_id_fkey" FOREIGN KEY ("surat_masuk_id") REFERENCES "surat_masuk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposisi" ADD CONSTRAINT "disposisi_dari_user_id_fkey" FOREIGN KEY ("dari_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposisi" ADD CONSTRAINT "disposisi_kepada_user_id_fkey" FOREIGN KEY ("kepada_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iuran" ADD CONSTRAINT "iuran_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iuran" ADD CONSTRAINT "iuran_diverifikasi_oleh_fkey" FOREIGN KEY ("diverifikasi_oleh") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
