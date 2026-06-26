-- CreateEnum
CREATE TYPE "OutletType" AS ENUM ('NEW', 'EXISTING');

-- AlterTable
ALTER TABLE "Retailer" ADD COLUMN     "outletType" "OutletType" NOT NULL DEFAULT 'EXISTING',
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "salesOfficerId" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- AddForeignKey
ALTER TABLE "Retailer" ADD CONSTRAINT "Retailer_salesOfficerId_fkey" FOREIGN KEY ("salesOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
