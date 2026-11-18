import { gameReducer } from './generated/game.js';

// Server-owned metadata, stored inside the authoritative JSON, never from the client.
// The current test-mode unlimited attacks remain unlimited, but clicks cannot be
// accelerated beyond four per second by calling the API directly.
export const BOSS_MIN_ATTACK_INTERVAL_MS = 250;

export const advanceCombat = (state: Record<string, unknown>, now: number): Record<string, unknown> =>
  gameReducer(state, { type: 'BOSS_TICK', now });

export const applyCombatAction = (state: Record<string, unknown>, action: Record<string, unknown>, now: number): Record<string, unknown> => {
  const current = advanceCombat(state, now);
  if (action.type === 'BOSS_TICK') return current;
  if (action.type === 'BOSS_SKILL') {
    const last = typeof current.serverLastBossAttackAt === 'number' ? current.serverLastBossAttackAt : 0;
    if (last > 0 && now - last < BOSS_MIN_ATTACK_INTERVAL_MS) {
      return { ...current, lastMessage: 'Подождите перед следующим ударом.' };
    }
    const result = gameReducer(current, { ...action, now });
    // Only a successful ability moves the server-side rate-limit marker.
    const before = current.battle as { turn?: number } | null;
    const after = result.battle as { turn?: number } | null;
    return before && after && typeof before.turn === 'number' && typeof after.turn === 'number' && after.turn > before.turn
      ? { ...result, serverLastBossAttackAt: now }
      : result;
  }
  return gameReducer(current, action);
};
