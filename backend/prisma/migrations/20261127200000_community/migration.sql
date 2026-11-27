-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "credit" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "GemAdd" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gemId" TEXT NOT NULL,
    "postId" TEXT,
    "tripId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GemAdd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedGem" (
    "userId" TEXT NOT NULL,
    "gemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedGem_pkey" PRIMARY KEY ("userId","gemId")
);

-- CreateTable
CREATE TABLE "PrizeGrant" (
    "month" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrizeGrant_pkey" PRIMARY KEY ("month")
);

-- CreateIndex
CREATE INDEX "GemAdd_gemId_idx" ON "GemAdd"("gemId");

-- CreateIndex
CREATE INDEX "GemAdd_postId_createdAt_idx" ON "GemAdd"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GemAdd_userId_gemId_key" ON "GemAdd"("userId", "gemId");

-- AddForeignKey
ALTER TABLE "GemAdd" ADD CONSTRAINT "GemAdd_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GemAdd" ADD CONSTRAINT "GemAdd_gemId_fkey" FOREIGN KEY ("gemId") REFERENCES "Gem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GemAdd" ADD CONSTRAINT "GemAdd_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedGem" ADD CONSTRAINT "SavedGem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedGem" ADD CONSTRAINT "SavedGem_gemId_fkey" FOREIGN KEY ("gemId") REFERENCES "Gem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

