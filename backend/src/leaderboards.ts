import type { Prisma } from '@prisma/client';

export const leaderboardsEnabled = () => process.env.LEADERBOARDS_ENABLED === 'true';
// Weeks start Monday 00:00 UTC, independent of the device clock and locale.
export const weekStart = (date: Date): string => {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
};
type State = Record<string, any>;
export const scoreDelta = (before: State, after: State, action: Record<string, unknown>) => {
  const b = before.battle, a = after.battle;
  const valid = action.type === 'BOSS_SKILL' && b?.source === 'boss' && !b.coopEncounterId && b.outcome === 'fighting' && a?.source === 'boss' && a.startedAt === b.startedAt;
  const raw = valid ? Number(a.damageDealt) - Number(b.damageDealt) : 0;
  const damage = Number.isSafeInteger(raw) && raw > 0 && raw <= Number(b.bossHp) ? raw : 0;
  const arenaWins = action.type === 'ARENA_SKILL' && before.arena?.battle?.outcome === 'fighting' && after.arena?.battle?.outcome === 'won' ? 1 : 0;
  return { damage, arenaWins };
};

// Called only inside the same transaction as the progress update / cooperative hit.
export const recordScore = async (tx: Prisma.TransactionClient, vkId: number, damage: number, wins: number, now: Date) => {
  if (!leaderboardsEnabled() || (!damage && !wins)) return;
  if (!Number.isSafeInteger(damage) || damage < 0 || !Number.isSafeInteger(wins) || wins < 0) throw new Error('Invalid leaderboard increment');
  for (const period of ['all', weekStart(now)]) {
    await tx.$executeRaw`INSERT INTO "LeaderboardScore" ("vkId", "period", "bossDamage", "arenaWins") VALUES (${vkId}, ${period}, ${damage}, ${wins})
      ON CONFLICT ("period", "vkId") DO UPDATE SET "bossDamage" = "LeaderboardScore"."bossDamage" + EXCLUDED."bossDamage", "arenaWins" = "LeaderboardScore"."arenaWins" + EXCLUDED."arenaWins"`;
  }
};
