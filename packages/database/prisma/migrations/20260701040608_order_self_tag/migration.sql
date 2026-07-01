-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('RETAILER', 'SELF');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "orderType" "OrderType" NOT NULL DEFAULT 'RETAILER';
