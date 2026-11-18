CREATE TABLE "LeaderboardScore" (
  "vkId" INTEGER NOT NULL REFERENCES "PlayerProgress"("vkId") ON DELETE CASCADE,
  "period" TEXT NOT NULL,
  "bossDamage" BIGINT NOT NULL DEFAULT 0 CHECK ("bossDamage" >= 0),
  "arenaWins" BIGINT NOT NULL DEFAULT 0 CHECK ("arenaWins" >= 0),
  PRIMARY KEY ("period", "vkId")
);
CREATE INDEX "LeaderboardScore_boss_rank" ON "LeaderboardScore" ("period", "bossDamage" DESC, "vkId");
CREATE INDEX "LeaderboardScore_arena_rank" ON "LeaderboardScore" ("period", "arenaWins" DESC, "vkId");
