-- AlterTable
ALTER TABLE "distrik" ADD COLUMN     "is_visible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "nasional" ADD COLUMN     "is_visible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ranting" ADD COLUMN     "is_visible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "wilayah" ADD COLUMN     "is_visible" BOOLEAN NOT NULL DEFAULT true;
