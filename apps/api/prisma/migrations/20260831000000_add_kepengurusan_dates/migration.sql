-- AlterTable: Add start_date and end_date to kepengurusan
ALTER TABLE "kepengurusan" ADD COLUMN "start_date" TIMESTAMP(3),
                            ADD COLUMN "end_date" TIMESTAMP(3);
