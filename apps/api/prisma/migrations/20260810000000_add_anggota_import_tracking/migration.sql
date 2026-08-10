-- AlterTable
ALTER TABLE "anggota" ADD COLUMN "is_imported" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "anggota" ADD COLUMN "import_source" TEXT;
ALTER TABLE "anggota" ADD COLUMN "imported_at" TIMESTAMP(3);
