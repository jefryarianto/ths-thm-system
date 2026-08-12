-- Add phone + must_change_password fields to users table
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- Unique index for users.phone
-- PostgreSQL allows multiple NULLs in a unique column, so existing
-- records with NULL phone won't conflict.
CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_key" ON "users"("phone");
