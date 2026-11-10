import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';

// These functions MUST be called inside the same Prisma transaction that locks
// and saves PlayerProgress. The client must never supply damage or rewards.
export interface CoopBossConfig { bossId: string; maxHp: number; rewardXp: number; rewardGold: number; rewardBullets: number }
export interface CoopBossRow extends CoopBossConfig { id: string; hp: number; status: 'alive' | 'dead' }
interface Hit { damage: number; hpAfter: number }
interface Attacker { vkId: number; damage: number }
export interface CoopReward { vkId: number; xp: number; gold: number; bullets: number }
const validInt = (n: number, min: number) => Number.isSafeInteger(n) && n >= min && n <= 2_147_483_647;
const validId = (value: string) => typeof value === 'string' && value.length > 0 && value.length <= 100;

// Deterministic remainder allocation keeps the total exactly equal to the pool.
export const splitCoopRewards = (attackers: Attacker[], boss: CoopBossConfig): CoopReward[] => {
  const sorted = [...attackers].sort((a, b) => a.vkId - b.vkId);
  if (new Set(sorted.map(a => a.vkId)).size !== sorted.length || sorted.some(a => !validInt(a.vkId, 1) || !validInt(a.damage, 1))) throw new Error('Invalid attackers');
  if (![boss.rewardXp, boss.rewardGold, boss.rewardBullets].every(n => validInt(n, 0))) throw new Error('Invalid reward');
  const share = (total: number, i: number) => Math.floor(total / sorted.length) + (i < total % sorted.length ? 1 : 0);
  return sorted.map((a, i) => ({ vkId: a.vkId, xp: share(boss.rewardXp, i), gold: share(boss.rewardGold, i), bullets: share(boss.rewardBullets, i) }));
};

// Spawns only if there is no live encounter. The partial unique index is the
// arbiter when several servers attempt to spawn the same boss simultaneously.
export const joinCoopBoss = async (tx: Prisma.TransactionClient, config: CoopBossConfig): Promise<CoopBossRow> => {
  if (!validId(config.bossId) || !validInt(config.maxHp, 1) || ![config.rewardXp, config.rewardGold, config.rewardBullets].every(n => validInt(n, 0))) throw new Error('Invalid boss config');
  const id = randomUUID();
  await tx.$executeRaw`
    INSERT INTO "CoopBoss" ("id", "bossId", "maxHp", "hp", "status", "rewardXp", "rewardGold", "rewardBullets")
    VALUES (${id}, ${config.bossId}, ${config.maxHp}, ${config.maxHp}, 'alive', ${config.rewardXp}, ${config.rewardGold}, ${config.rewardBullets})
    ON CONFLICT DO NOTHING
  `;
  const rows = await tx.$queryRaw<CoopBossRow[]>`
    SELECT "id", "bossId", "maxHp", "hp", "status", "rewardXp", "rewardGold", "rewardBullets"
    FROM "CoopBoss" WHERE "bossId" = ${config.bossId} AND "status" = 'alive' FOR UPDATE
  `;
  // The active encounter can have died while waiting for the unique-index lock.
  // The caller may retry the whole transaction, never reset the dead encounter.
  if (!rows[0]) throw new Error('Active boss changed; retry the transaction');
  return rows[0];
};

export interface CoopHitResult { duplicate: boolean; damage: number; hp: number; maxHp: number; status: 'alive' | 'dead' }
// Only trusted server-computed damage is accepted here. Validation of membership,
// skill energy, cooldown and rate limits belongs to the caller in this same tx.
export const takeCoopDamage = async (tx: Prisma.TransactionClient, encounterId: string, vkId: number, attackId: string, damage: number): Promise<CoopHitResult> => {
  if (!validId(encounterId) || !validInt(vkId, 1) || !validId(attackId) || !validInt(damage, 1)) throw new Error('Invalid hit');
  const bosses = await tx.$queryRaw<CoopBossRow[]>`
    SELECT "id", "bossId", "maxHp", "hp", "status", "rewardXp", "rewardGold", "rewardBullets"
    FROM "CoopBoss" WHERE "id" = ${encounterId} FOR UPDATE
  `;
  const boss = bosses[0];
  if (!boss) throw new Error('Encounter not found');
  const hits = await tx.$queryRaw<Hit[]>`
    SELECT "damage", "hpAfter" FROM "CoopBossHit"
    WHERE "encounterId" = ${encounterId} AND "vkId" = ${vkId} AND "attackId" = ${attackId}
  `;
  if (hits[0]) return { duplicate: true, damage: hits[0].damage, hp: boss.hp, maxHp: boss.maxHp, status: boss.status };
  if (boss.status === 'dead') return { duplicate: false, damage: 0, hp: 0, maxHp: boss.maxHp, status: 'dead' };
  const applied = Math.min(boss.hp, damage);
  const hp = boss.hp - applied;
  const status = hp === 0 ? 'dead' : 'alive';
  await tx.$executeRaw`UPDATE "CoopBoss" SET "hp" = ${hp}, "status" = ${status}, "diedAt" = CASE WHEN ${status} = 'dead' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE "id" = ${encounterId}`;
  await tx.$executeRaw`
    INSERT INTO "CoopBossAttacker" ("encounterId", "vkId", "damage") VALUES (${encounterId}, ${vkId}, ${applied})
    ON CONFLICT ("encounterId", "vkId") DO UPDATE SET "damage" = "CoopBossAttacker"."damage" + EXCLUDED."damage"
  `;
  await tx.$executeRaw`INSERT INTO "CoopBossHit" ("encounterId", "vkId", "attackId", "damage", "hpAfter") VALUES (${encounterId}, ${vkId}, ${attackId}, ${applied}, ${hp})`;
  if (status === 'dead') {
    const attackers = await tx.$queryRaw<Attacker[]>`SELECT "vkId", "damage" FROM "CoopBossAttacker" WHERE "encounterId" = ${encounterId} ORDER BY "vkId"`;
    for (const reward of splitCoopRewards(attackers, boss)) {
      await tx.$executeRaw`
        INSERT INTO "CoopBossReward" ("encounterId", "vkId", "xp", "gold", "bullets")
        VALUES (${encounterId}, ${reward.vkId}, ${reward.xp}, ${reward.gold}, ${reward.bullets})
        ON CONFLICT ("encounterId", "vkId") DO NOTHING
      `;
    }
  }
  return { duplicate: false, damage: applied, hp, maxHp: boss.maxHp, status };
};

interface ProgressRow { state: Record<string, unknown>; revision: number }
interface PendingReward extends CoopReward { encounterId: string }
export interface CoopClaimResult { state: Record<string, unknown>; revision: number; claimed: PendingReward[] }

// Atomically credits every pending reward to the existing server progress.
// Call in a transaction, and use the returned state/revision for subsequent
// updates in that transaction. Lock order: player row (NO KEY UPDATE), then boss.
// NO KEY UPDATE permits the foreign-key key-share locks taken by other hits.
export const claimCoopRewards = async (tx: Prisma.TransactionClient, vkId: number): Promise<CoopClaimResult> => {
  if (!validInt(vkId, 1)) throw new Error('Invalid player');
  const progress = await tx.$queryRaw<ProgressRow[]>`SELECT "state", "revision" FROM "PlayerProgress" WHERE "vkId" = ${vkId} FOR NO KEY UPDATE`;
  if (!progress[0] || !progress[0].state || typeof progress[0].state !== 'object' || Array.isArray(progress[0].state)) throw new Error('Player progress not found');
  const pending = await tx.$queryRaw<PendingReward[]>`
    SELECT "encounterId", "vkId", "xp", "gold", "bullets" FROM "CoopBossReward"
    WHERE "vkId" = ${vkId} AND "claimedAt" IS NULL ORDER BY "encounterId" FOR UPDATE
  `;
  if (!pending.length) return { ...progress[0], claimed: [] };
  const state = { ...progress[0].state };
  for (const [field, rewardField] of [['experience', 'xp'], ['gold', 'gold'], ['bullets', 'bullets']] as const) {
    const old = state[field] ?? 0;
    if (typeof old !== 'number' || !Number.isSafeInteger(old) || old < 0) throw new Error(`Invalid player ${field}`);
    const amount = pending.reduce((sum: number, reward: PendingReward) => sum + reward[rewardField], 0);
    if (!Number.isSafeInteger(old + amount)) throw new Error('Reward balance overflow');
    state[field] = old + amount;
  }
  await tx.$executeRaw`
    UPDATE "PlayerProgress" SET "state" = ${JSON.stringify(state)}::jsonb, "revision" = "revision" + 1, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "vkId" = ${vkId}
  `;
  // Mark only locked rows included in this payout; a different boss can die concurrently.
  for (const reward of pending) {
    await tx.$executeRaw`UPDATE "CoopBossReward" SET "claimedAt" = CURRENT_TIMESTAMP WHERE "vkId" = ${vkId} AND "encounterId" = ${reward.encounterId} AND "claimedAt" IS NULL`;
  }
  return { state, revision: progress[0].revision + 1, claimed: pending };
};
