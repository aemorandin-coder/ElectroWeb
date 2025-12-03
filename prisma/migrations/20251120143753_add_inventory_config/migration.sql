-- AlterTable
ALTER TABLE "company_settings" ADD COLUMN     "autoHideOutOfStock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "criticalStockThreshold" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "notifyLowStock" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyOutOfStock" BOOLEAN NOT NULL DEFAULT true;
