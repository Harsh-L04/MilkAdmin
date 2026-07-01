-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'PROSPECTIVE', 'ONBOARDED', 'REJECTED');

-- AlterTable
ALTER TABLE "Distributor" ADD COLUMN     "bankDetails" TEXT,
ADD COLUMN     "onboardingNote" TEXT,
ADD COLUMN     "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "pan" TEXT,
ADD COLUMN     "securityDeposit" DECIMAL(12,2),
ADD COLUMN     "subArea" TEXT;

-- AlterTable
ALTER TABLE "Retailer" ADD COLUMN     "brandsDealing" TEXT[],
ADD COLUMN     "instrumentDate" TIMESTAMP(3),
ADD COLUMN     "instrumentNo" TEXT,
ADD COLUMN     "licenseImageKey" TEXT,
ADD COLUMN     "monthlyTurnover" DECIMAL(14,2),
ADD COLUMN     "onboardingNote" TEXT,
ADD COLUMN     "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "pan" TEXT,
ADD COLUMN     "productsSold" TEXT[],
ADD COLUMN     "securityDeposit" DECIMAL(12,2),
ADD COLUMN     "shopEstablishedOn" TEXT,
ADD COLUMN     "shopLicenseNo" TEXT,
ADD COLUMN     "subArea" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "area" TEXT,
ADD COLUMN     "reportsToId" TEXT,
ADD COLUMN     "subArea" TEXT;

-- CreateIndex
CREATE INDEX "User_reportsToId_idx" ON "User"("reportsToId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_reportsToId_fkey" FOREIGN KEY ("reportsToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
