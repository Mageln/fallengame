-- Preserve live encounters while making their next key part of every participant's reward.
ALTER TABLE "CoopBoss" ADD COLUMN "nextBossId" TEXT;
ALTER TABLE "CoopBossReward" ADD COLUMN "keyBossId" TEXT;
UPDATE "CoopBoss" SET "nextBossId" = CASE "bossId"
  WHEN 'zombie' THEN 'zombie_brute'
  WHEN 'zombie_brute' THEN '1'
  WHEN '1' THEN '2'
  WHEN '2' THEN '3'
  WHEN '3' THEN '4'
  ELSE NULL END
WHERE "status" = 'alive';
