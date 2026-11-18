CREATE TABLE "PlayerProgress" (
    "vkId" INTEGER NOT NULL,
    "state" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlayerProgress_pkey" PRIMARY KEY ("vkId")
);
