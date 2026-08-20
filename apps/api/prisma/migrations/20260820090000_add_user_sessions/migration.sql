-- Tabel sesi login: refresh token per perangkat.
-- Mendukung rotasi token, deteksi reuse (token lama dipakai ulang),
-- daftar sesi aktif, dan revoke per sesi.

CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "device_name" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_sessions_refresh_token_key" ON "user_sessions"("refresh_token");

CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

CREATE INDEX "user_sessions_refresh_token_idx" ON "user_sessions"("refresh_token");

-- FK ke users (cascade: hapus user → sesi ikut terhapus).
ALTER TABLE "user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;