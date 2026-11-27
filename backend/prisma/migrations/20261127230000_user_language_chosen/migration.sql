-- The language is null until the traveller or their browser chose one (27 Nov): an "en" default
-- switched people with a Dutch phone to English when they signed in.
ALTER TABLE "User" ALTER COLUMN "language" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "language" DROP DEFAULT;
UPDATE "User" SET "language" = NULL WHERE "language" = 'en';
