-- AlterTable
ALTER TABLE "User" ADD COLUMN     "plusBonusDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stripeSubscriptionId" TEXT;
