-- Melacak percobaan ulang email (insiden retry-loop 2026-09):
--   retry_count    : jumlah percobaan retry → batas maksimal attempts
--   last_retry_at  : waktu percobaan terakhir → backoff antar percobaan
-- Kolom baru dengan DEFAULT bersifat metadata-only di PostgreSQL 11+ (instan
-- meski tabel besar), jadi aman untuk produksi tanpa lock panjang.
ALTER TABLE "email_logs" ADD COLUMN "retry_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "email_logs" ADD COLUMN "last_retry_at" TIMESTAMP(3);
