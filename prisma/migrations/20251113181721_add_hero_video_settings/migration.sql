-- AlterTable
ALTER TABLE "company_settings" ADD COLUMN     "heroVideoDescription" TEXT,
ADD COLUMN     "heroVideoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "heroVideoTitle" TEXT,
ADD COLUMN     "heroVideoUrl" TEXT;
