-- Idempotent (AMAN untuk drift): kolom/tabel mungkin sudah pernah dibuat
-- manual via `prisma db push` atau intervensi langsung di production.
-- `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` / DO-block untuk FK
-- membuat migration ini tetap sukses apa pun kondisi awal DB.

-- AlterTable
ALTER TABLE "forum_threads" ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "forum_posts" ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE IF NOT EXISTS "forum_thread_reactions" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_thread_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "forum_post_reactions" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_post_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "forum_thread_reactions_thread_id_idx" ON "forum_thread_reactions"("thread_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "forum_thread_reactions_user_id_idx" ON "forum_thread_reactions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "forum_thread_reactions_thread_id_user_id_key" ON "forum_thread_reactions"("thread_id", "user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "forum_post_reactions_post_id_idx" ON "forum_post_reactions"("post_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "forum_post_reactions_user_id_idx" ON "forum_post_reactions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "forum_post_reactions_post_id_user_id_key" ON "forum_post_reactions"("post_id", "user_id");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forum_thread_reactions_thread_id_fkey') THEN
    ALTER TABLE "forum_thread_reactions" ADD CONSTRAINT "forum_thread_reactions_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "forum_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forum_thread_reactions_user_id_fkey') THEN
    ALTER TABLE "forum_thread_reactions" ADD CONSTRAINT "forum_thread_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forum_post_reactions_post_id_fkey') THEN
    ALTER TABLE "forum_post_reactions" ADD CONSTRAINT "forum_post_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forum_post_reactions_user_id_fkey') THEN
    ALTER TABLE "forum_post_reactions" ADD CONSTRAINT "forum_post_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
