UPDATE "users"
SET "email" = lower(trim("email"))
WHERE "email" IS NOT NULL AND "email" <> lower(trim("email"));

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_key"
ON "users" (lower("email"));
