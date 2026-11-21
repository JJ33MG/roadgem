-- CreateTable
CREATE TABLE "PlaceGem" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'other',
    "rating" DOUBLE PRECISION NOT NULL,
    "reviews" INTEGER NOT NULL,
    "photoRef" TEXT,
    "types" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaceGem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GemSearch" (
    "cell" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'trip',
    "found" INTEGER NOT NULL DEFAULT 0,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GemSearch_pkey" PRIMARY KEY ("cell")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlaceGem_placeId_key" ON "PlaceGem"("placeId");

-- CreateIndex
CREATE INDEX "PlaceGem_lat_lng_idx" ON "PlaceGem"("lat", "lng");

-- CreateIndex
CREATE INDEX "GemSearch_source_idx" ON "GemSearch"("source");
