-- CreateTable
CREATE TABLE "DestinationSeo" (
    "id" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metaDescription" TEXT NOT NULL,
    "h1" TEXT NOT NULL,
    "intro" TEXT NOT NULL,
    "topKeywords" TEXT NOT NULL,
    "faq" TEXT NOT NULL,
    "internalLinkSuggestions" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DestinationSeo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DestinationSeo_destination_key" ON "DestinationSeo"("destination");

-- CreateIndex
CREATE UNIQUE INDEX "DestinationSeo_slug_key" ON "DestinationSeo"("slug");

-- CreateIndex
CREATE INDEX "DestinationSeo_slug_idx" ON "DestinationSeo"("slug");
