import { BOSSES } from './bosses';
import { BOSS_ATTACK_CONFIG, DAILY_BOSS_ATTACKS, todayLocal } from './survival';
import type { BossAttackEntry, BossAttacks, GameState } from './types';

// Счётчики не изменяются в тестовом режиме, чтобы не тратить купленные атаки.
export const resetBossAttacks = (state: GameState, now = Date.now()): GameState => {
  if (!BOSS_ATTACK_CONFIG.timedLimits) return state;
  const attacks = state.bossAttacks;
  if (attacks.resetAt === undefined) {
    if (Object.keys(attacks.entries).length === 0) return state;
    // Старое сохранение: сохраняем оставшиеся/купленные атаки на первый период.
    return { ...state, bossAttacks: { ...attacks, resetAt: now + BOSS_ATTACK_CONFIG.resetIntervalMs } };
  }
  if (now < attacks.resetAt) return state;
  return { ...state, bossAttacks: { date: todayLocal(now), entries: {} } };
};

// Лимиты нападений — свои у каждого босса (см. BossDef.dailyLimit).
// Старые сохранения с общим счётчиком (used/purchased без entries) мигрируют в 'shared',
// чтобы не сбросить купленные атаки молча.
export const normalizeBossAttacks = (attacks: BossAttacks): BossAttacks => {
  const raw = attacks as unknown as { date: string; resetAt?: number; entries?: Record<string, { used?: number; purchased?: number }>; used?: number; purchased?: number };
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
    const resetAt = Number.isFinite(raw.resetAt) ? raw.resetAt : undefined;
    return { date, entries, ...(resetAt !== undefined ? { resetAt } : {}) };
  }
  const used = Math.max(0, Math.floor(raw?.used ?? 0));
  const purchased = Math.max(0, Math.floor(raw?.purchased ?? 0));
  if (used === 0 && purchased === 0) return { date: today, entries: {} };
  // Общий лимит раньше равнялся DAILY_BOSS_ATTACKS на всех боссов —
  // при миграции отдаём остаток каждому известному боссу, но не больше его лимита.
  const entries: Record<string, BossAttackEntry> = {};
  for (const boss of BOSSES) {
    const free = Math.max(0, Math.min(boss.dailyLimit, DAILY_BOSS_ATTACKS) - used);
    if (free < boss.dailyLimit || purchased > 0) {
      entries[boss.id] = { used: boss.dailyLimit - free, purchased };
    }
  }
  entries.shared = { used, purchased };
  return { date, entries };
};

export const getBossAttackEntry = (state: GameState, bossId: string): BossAttackEntry =>
  state.bossAttacks.entries[bossId] ?? { used: 0, purchased: 0 };

export const setBossAttackEntry = (
  state: GameState,
  bossId: string,
  entry: BossAttackEntry,
  now = Date.now()
): GameState => ({
  ...state,
  bossAttacks: {
    ...state.bossAttacks,
    resetAt: state.bossAttacks.resetAt ?? (now + BOSS_ATTACK_CONFIG.resetIntervalMs),
    entries: { ...state.bossAttacks.entries, [bossId]: entry },
  },
});

