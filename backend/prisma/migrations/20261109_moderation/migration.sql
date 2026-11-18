CREATE TABLE "PlayerBan" (
  "vkId" INTEGER PRIMARY KEY,
  "reason" VARCHAR(300) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "actorVkId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "ModerationAudit" (
  "id" BIGSERIAL PRIMARY KEY,
  "targetVkId" INTEGER NOT NULL,
  "actorVkId" INTEGER NOT NULL,
  "action" VARCHAR(16) NOT NULL,
  "reason" VARCHAR(300),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ModerationAudit_targetVkId_createdAt_idx" ON "ModerationAudit" ("targetVkId", "createdAt");
