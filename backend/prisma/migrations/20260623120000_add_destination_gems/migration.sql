-- CreateTable
CREATE TABLE "DestinationGem" (
    "id" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "whyHidden" TEXT NOT NULL,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DestinationGem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DestinationGem_destination_idx" ON "DestinationGem"("destination");
