-- Add MERCANTIL_PANAMA to PaymentMethodType enum
ALTER TYPE "PaymentMethodType" ADD VALUE IF NOT EXISTS 'MERCANTIL_PANAMA';

-- Add new columns to company_payment_methods table
ALTER TABLE "company_payment_methods" ADD COLUMN IF NOT EXISTS "logo" TEXT;
ALTER TABLE "company_payment_methods" ADD COLUMN IF NOT EXISTS "qrCodeImage" TEXT;
ALTER TABLE "company_payment_methods" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "company_payment_methods" ADD COLUMN IF NOT EXISTS "minAmount" DECIMAL;
ALTER TABLE "company_payment_methods" ADD COLUMN IF NOT EXISTS "maxAmount" DECIMAL;
ALTER TABLE "company_payment_methods" ADD COLUMN IF NOT EXISTS "displayNote" TEXT;
