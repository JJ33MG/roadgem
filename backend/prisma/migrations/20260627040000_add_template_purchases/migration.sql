CREATE TABLE "TemplatePurchase" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "userId"     TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "stripeId"   TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "TemplatePurchase_userId_templateId_key" ON "TemplatePurchase"("userId", "templateId");
CREATE INDEX "TemplatePurchase_userId_idx" ON "TemplatePurchase"("userId");
