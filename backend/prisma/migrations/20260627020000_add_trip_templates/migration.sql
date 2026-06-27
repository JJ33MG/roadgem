CREATE TABLE "TripTemplate" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "title"         TEXT NOT NULL,
  "slug"          TEXT NOT NULL,
  "description"   TEXT NOT NULL,
  "emoji"         TEXT NOT NULL DEFAULT '🗺️',
  "startLocation" TEXT NOT NULL,
  "destination"   TEXT NOT NULL,
  "days"          INTEGER NOT NULL,
  "budget"        DOUBLE PRECISION NOT NULL,
  "travelStyle"   TEXT NOT NULL,
  "highlights"    TEXT NOT NULL,
  "stops"         TEXT NOT NULL,
  "itinerary"     TEXT NOT NULL,
  "tips"          TEXT NOT NULL,
  "totalCost"     DOUBLE PRECISION NOT NULL,
  "totalDistance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "priceEur"      DOUBLE PRECISION NOT NULL DEFAULT 4.99,
  "featured"      BOOLEAN NOT NULL DEFAULT false,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "TripTemplate_slug_key" ON "TripTemplate"("slug");
CREATE INDEX "TripTemplate_featured_idx" ON "TripTemplate"("featured");
