-- Create enum types for document batch jobs
CREATE TYPE "BatchStatus" AS ENUM ('pending', 'processing', 'completed', 'completed_with_errors', 'cancelled');
CREATE TYPE "JobStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create DocumentBatchJob table
CREATE TABLE "document_batch_jobs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "total_jobs" INTEGER NOT NULL,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "status" "BatchStatus" NOT NULL DEFAULT 'pending',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_batch_jobs_pkey" PRIMARY KEY ("id")
);

-- Create DocumentJob table
CREATE TABLE "document_jobs" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "nomor_dokumen" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_jobs_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "document_batch_jobs_status_idx" ON "document_batch_jobs"("status");
CREATE INDEX "document_batch_jobs_created_at_idx" ON "document_batch_jobs"("created_at" DESC);
CREATE INDEX "document_jobs_batch_id_idx" ON "document_jobs"("batch_id");
CREATE INDEX "document_jobs_status_idx" ON "document_jobs"("status");

-- Add foreign key
ALTER TABLE "document_jobs" ADD CONSTRAINT "document_jobs_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "document_batch_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
