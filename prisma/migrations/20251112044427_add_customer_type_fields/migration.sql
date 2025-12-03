-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "customerType" TEXT DEFAULT 'PERSON',
ADD COLUMN     "taxId" TEXT;
