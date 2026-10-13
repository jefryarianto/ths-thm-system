-- ForumPost: nested replies (self-referencing parent_id)
ALTER TABLE "forum_posts" ADD COLUMN "parent_id" TEXT;

CREATE INDEX "forum_posts_parent_id_idx" ON "forum_posts"("parent_id");

ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "forum_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
