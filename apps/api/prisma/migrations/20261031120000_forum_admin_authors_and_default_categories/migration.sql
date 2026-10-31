-- AlterTable
ALTER TABLE "forum_threads" ALTER COLUMN "author_id" DROP NOT NULL,
ADD COLUMN "author_name" TEXT;

-- AlterTable
ALTER TABLE "forum_posts" ALTER COLUMN "author_id" DROP NOT NULL,
ADD COLUMN "author_name" TEXT;

-- Create default forum categories
INSERT INTO "forum_categories" ("id", "nama", "deskripsi", "order", "created_at", "updated_at")
VALUES
  ('forum-cat-diskusi-umum', 'Diskusi Umum', 'Diskusi umum antar anggota', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('forum-cat-pengumuman', 'Pengumuman', 'Pengumuman resmi organisasi', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('forum-cat-tanya-jawab', 'Tanya Jawab', 'Pertanyaan dan jawaban seputar organisasi', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
