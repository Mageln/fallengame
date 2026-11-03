import { BOSSES } from './bosses';
import { DAILY_BOSS_ATTACKS, todayLocal } from './survival';
import type { BossAttackEntry, BossAttacks, GameState } from './types';

export const resetBossAttacks = (state: GameState, now = Date.now()): GameState => {
  const today = todayLocal(now);
  if (state.bossAttacks.date === today) return state;
  return { ...state, bossAttacks: { date: today, entries: {} } };
};

// Лимиты нападений — свои у каждого босса (см. BossDef.dailyLimit).
// Старые сохранения с общим счётчиком (used/purchased без entries) мигрируют в 'shared',
// чтобы не сбросить купленные атаки молча.
export const normalizeBossAttacks = (attacks: BossAttacks): BossAttacks => {
  const raw = attacks as unknown as { date: string; entries?: Record<string, { used?: number; purchased?: number }>; used?: number; purchased?: number };
  const today = todayLocal();
  const date = typeof raw?.date === 'string' ? raw.date : today;
  if (raw && typeof raw.entries === 'object' && raw.entries !== null) {
    const entries: Record<string, BossAttackEntry> = {};
    for (const [bossId, entry] of Object.entries(raw.entries)) {
      entries[bossId] = {
        used: Math.max(0, Math.floor(entry?.used ?? 0)),
        purchased: Math.max(0, Math.floor(entry?.purchased ?? 0)),
      };
    }
    return date === today ? { date, entries } : { date: today, entries: {} };
  }
  const used = Math.max(0, Math.floor(raw?.used ?? 0));
  const purchased = Math.max(0, Math.floor(raw?.purchased ?? 0));
  if (used === 0 && purchased === 0) return { date: today, entries: {} };
  // Общий лимит раньше равнялся DAILY_BOSS_ATTACKS на всех боссов —
  // при миграции отдаём остаток каждому известному боссу, но не больше его лимита.
  const entries: Record<string, BossAttackEntry> = {};
  if (date === today) {
    for (const boss of BOSSES) {
      const free = Math.max(0, Math.min(boss.dailyLimit, DAILY_BOSS_ATTACKS) - used);
      if (free < boss.dailyLimit || purchased > 0) {
        entries[boss.id] = { used: boss.dailyLimit - free, purchased };
      }
    }
    if (purchased > 0 || used > 0) entries.shared = { used, purchased };
  }
  return { date: today, entries };
};

export const getBossAttackEntry = (state: GameState, bossId: string): BossAttackEntry =>
  state.bossAttacks.entries[bossId] ?? { used: 0, purchased: 0 };

export const setBossAttackEntry = (
  state: GameState,
  bossId: string,
  entry: BossAttackEntry
): GameState => ({
  ...state,
  bossAttacks: {
    ...state.bossAttacks,
    entries: { ...state.bossAttacks.entries, [bossId]: entry },
  },
});

