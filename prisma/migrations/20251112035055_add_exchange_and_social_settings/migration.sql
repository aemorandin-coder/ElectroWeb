-- AlterTable
ALTER TABLE "company_settings" ADD COLUMN     "autoExchangeRates" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "socialMedia" JSONB;
