-- CreateTable
CREATE TABLE "DestinationQueue" (
    "id" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "gemDepth" INTEGER NOT NULL DEFAULT 0,
    "seoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastResearched" TIMESTAMP(3),

    CONSTRAINT "DestinationQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DestinationQueue_destination_key" ON "DestinationQueue"("destination");

-- CreateIndex
CREATE INDEX "DestinationQueue_gemDepth_priority_idx" ON "DestinationQueue"("gemDepth", "priority");
