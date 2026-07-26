-- CreateTable: national_holidays
CREATE TABLE "national_holidays" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "national_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "national_holidays_date_name_key" ON "national_holidays"("date", "name");
CREATE INDEX "national_holidays_date_idx" ON "national_holidays"("date");
CREATE INDEX "national_holidays_date_is_active_idx" ON "national_holidays"("date", "is_active");
