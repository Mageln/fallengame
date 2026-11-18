import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());
const { createInitialState } = await vite.ssrLoadModule('/src/game/initialState.ts');
const { BOSSES } = await vite.ssrLoadModule('/src/game/bosses.ts');
const { todayLocal, BOSS_ATTACK_CONFIG } = await vite.ssrLoadModule('/src/game/survival.ts');
const { getBossAttackEntry, normalizeBossAttacks, resetBossAttacks, setBossAttackEntry } =
  await vite.ssrLoadModule('/src/game/bossAttacks.ts');

test('boss counters are independent and updates do not mutate the previous state', () => {
  const state = createInitialState();
  const updated = setBossAttackEntry(state, '1', { used: 2, purchased: 1 });
  assert.deepEqual(getBossAttackEntry(state, '1'), { used: 0, purchased: 0 });
  assert.deepEqual(getBossAttackEntry(updated, '1'), { used: 2, purchased: 1 });
  assert.deepEqual(getBossAttackEntry(updated, '2'), { used: 0, purchased: 0 });
});

test('timed counters reset two hours after first attack, not at midnight', () => {
  BOSS_ATTACK_CONFIG.timedLimits = true;
  try {
    const now = new Date(2026, 3, 4, 23, 30).getTime();
    const state = setBossAttackEntry(createInitialState(), '1', { used: 3, purchased: 1 }, now);
    assert.equal(state.bossAttacks.resetAt, now + 2 * 60 * 60 * 1000);
    assert.equal(resetBossAttacks(state, now + 2 * 60 * 60 * 1000 - 1), state);
    const next = resetBossAttacks(state, now + 2 * 60 * 60 * 1000);
    assert.deepEqual(next.bossAttacks.entries, {});
    assert.equal(next.bossAttacks.resetAt, undefined);
  } finally { BOSS_ATTACK_CONFIG.timedLimits = false; }
});

test('saved per-boss counters are normalized and stale counters reset', () => {
  const today = todayLocal();
  assert.deepEqual(normalizeBossAttacks({ date: today, entries: { '1': { used: 2.8, purchased: -1 } } }),
    { date: today, entries: { '1': { used: 2, purchased: 0 } } });
  assert.deepEqual(normalizeBossAttacks({ date: '2000-01-01', entries: { '1': { used: 1, purchased: 1 } } }),
    { date: '2000-01-01', entries: { '1': { used: 1, purchased: 1 } } });
});

test('legacy shared counter migrates for every boss without losing purchased attacks', () => {
  const today = todayLocal();
  const result = normalizeBossAttacks({ date: today, used: 2, purchased: 1 });
  assert.deepEqual(result.entries.shared, { used: 2, purchased: 1 });
  for (const boss of BOSSES) {
    assert.equal(result.entries[boss.id].purchased, 1);
    assert.equal(result.entries[boss.id].used, boss.dailyLimit - Math.max(0, Math.min(boss.dailyLimit, 3) - 2));
  }
});

test('unlimited mode preserves existing counters and purchased attacks', () => {
  const state = { ...createInitialState(), bossAttacks: { date: '2000-01-01', entries: { '1': { used: 5, purchased: 1 } } } };
  assert.equal(resetBossAttacks(state, Date.now()), state);
});

test('legacy counters get a two-hour period when timed limits are enabled', () => {
  BOSS_ATTACK_CONFIG.timedLimits = true;
  try {
    const state = { ...createInitialState(), bossAttacks: { date: '2000-01-01', entries: { '1': { used: 5, purchased: 1 } } } };
    const next = resetBossAttacks(state, 1000);
    assert.equal(next.bossAttacks.resetAt, 1000 + 2 * 60 * 60 * 1000);
    assert.equal(next.bossAttacks.entries['1'].purchased, 1);
  } finally { BOSS_ATTACK_CONFIG.timedLimits = false; }
});
