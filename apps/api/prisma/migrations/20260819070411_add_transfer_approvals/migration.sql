-- AlterTable
ALTER TABLE "transfer_requests" ADD COLUMN     "requested_by" TEXT,
ADD COLUMN     "scope" TEXT NOT NULL DEFAULT 'distrik';

-- CreateTable
CREATE TABLE "transfer_approvals" (
    "id" TEXT NOT NULL,
    "transfer_request_id" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "order" INTEGER NOT NULL DEFAULT 0,
    "decided_by" TEXT,
    "decided_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transfer_approvals_status_idx" ON "transfer_approvals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_approvals_transfer_request_id_side_level_key" ON "transfer_approvals"("transfer_request_id", "side", "level");

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_anggota_id_fkey" FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_from_ranting_id_fkey" FOREIGN KEY ("from_ranting_id") REFERENCES "ranting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_to_ranting_id_fkey" FOREIGN KEY ("to_ranting_id") REFERENCES "ranting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_approvals" ADD CONSTRAINT "transfer_approvals_transfer_request_id_fkey" FOREIGN KEY ("transfer_request_id") REFERENCES "transfer_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
