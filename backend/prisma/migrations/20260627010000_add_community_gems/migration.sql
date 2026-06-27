CREATE TABLE "CommunityGem" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "userId"      TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "category"    TEXT NOT NULL,
  "location"    TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'pending',
  "aiScore"     INTEGER NOT NULL DEFAULT 0,
  "aiFeedback"  TEXT NOT NULL DEFAULT '',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityGem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CommunityGem_userId_idx" ON "CommunityGem"("userId");
CREATE INDEX "CommunityGem_status_idx" ON "CommunityGem"("status");
