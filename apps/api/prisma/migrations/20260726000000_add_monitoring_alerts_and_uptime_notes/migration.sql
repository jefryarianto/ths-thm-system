-- Migration: Add MonitoringAlert model + QueueUptimeEvent notes/component
-- Created: 2026-07-26

-- Create enum types for alert system
CREATE TYPE "AlertMetric" AS ENUM (
  'cpu_percent',
  'memory_percent',
  'disk_percent',
  'db_down',
  'queue_down',
  'api_down',
  'queue_downtime_ms',
  'queue_latency_ms',
  'queue_failed_jobs'
);

CREATE TYPE "AlertChannel" AS ENUM (
  'telegram',
  'email'
);

-- Create monitoring_alerts table
CREATE TABLE "monitoring_alerts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metric" "AlertMetric" NOT NULL,
    "operator" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "channels" "AlertChannel"[] NOT NULL DEFAULT ARRAY[]::"AlertChannel"[],
    "telegram_bot_token" TEXT,
    "telegram_chat_id" TEXT,
    "email_recipients" TEXT,
    "cooldown" INTEGER NOT NULL DEFAULT 300,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_triggered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monitoring_alerts_pkey" PRIMARY KEY ("id")
);

-- Indexes for monitoring_alerts
CREATE INDEX "monitoring_alerts_is_active_idx" ON "monitoring_alerts"("is_active");
CREATE INDEX "monitoring_alerts_metric_idx" ON "monitoring_alerts"("metric");

-- Add notes and component columns to existing queue_uptime_events table
ALTER TABLE "queue_uptime_events" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "queue_uptime_events" ADD COLUMN IF NOT EXISTS "component" TEXT DEFAULT 'queue';
