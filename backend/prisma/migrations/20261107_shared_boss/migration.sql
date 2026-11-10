-- Shared encounters are distinct from the per-player battle snapshot.
CREATE TABLE "CoopBoss" (
  "id" TEXT PRIMARY KEY,
  "bossId" TEXT NOT NULL,
  "maxHp" INTEGER NOT NULL CHECK ("maxHp" > 0),
  "hp" INTEGER NOT NULL CHECK ("hp" >= 0 AND "hp" <= "maxHp"),
  "status" TEXT NOT NULL CHECK ("status" IN ('alive', 'dead')),
  "rewardXp" INTEGER NOT NULL CHECK ("rewardXp" >= 0),
  "rewardGold" INTEGER NOT NULL CHECK ("rewardGold" >= 0),
  "rewardBullets" INTEGER NOT NULL CHECK ("rewardBullets" >= 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "diedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "CoopBoss_one_alive" ON "CoopBoss" ("bossId") WHERE "status" = 'alive';
CREATE TABLE "CoopBossAttacker" (
  "encounterId" TEXT NOT NULL REFERENCES "CoopBoss"("id"),
  "vkId" INTEGER NOT NULL REFERENCES "PlayerProgress"("vkId"),
  "damage" INTEGER NOT NULL CHECK ("damage" > 0),
  PRIMARY KEY ("encounterId", "vkId")
);
CREATE TABLE "CoopBossHit" (
  "encounterId" TEXT NOT NULL REFERENCES "CoopBoss"("id"),
  "vkId" INTEGER NOT NULL REFERENCES "PlayerProgress"("vkId"),
  "attackId" TEXT NOT NULL,
  "damage" INTEGER NOT NULL CHECK ("damage" > 0),
  "hpAfter" INTEGER NOT NULL CHECK ("hpAfter" >= 0),
  PRIMARY KEY ("encounterId", "vkId", "attackId")
);
CREATE TABLE "CoopBossReward" (
  "encounterId" TEXT NOT NULL REFERENCES "CoopBoss"("id"),
  "vkId" INTEGER NOT NULL REFERENCES "PlayerProgress"("vkId"),
  "xp" INTEGER NOT NULL CHECK ("xp" >= 0),
  "gold" INTEGER NOT NULL CHECK ("gold" >= 0),
  "bullets" INTEGER NOT NULL CHECK ("bullets" >= 0),
  "claimedAt" TIMESTAMP(3),
  PRIMARY KEY ("encounterId", "vkId")
);
CREATE INDEX "CoopBossReward_unclaimed" ON "CoopBossReward" ("vkId") WHERE "claimedAt" IS NULL;
