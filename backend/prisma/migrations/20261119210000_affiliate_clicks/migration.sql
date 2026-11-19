CREATE TABLE "AffiliateClick" (
    "id" TEXT NOT NULL,
    "partner" TEXT NOT NULL,
    "tripId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AffiliateClick_createdAt_idx" ON "AffiliateClick"("createdAt");
