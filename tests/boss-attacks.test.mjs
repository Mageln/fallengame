import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());
const { createInitialState } = await vite.ssrLoadModule('/src/game/initialState.ts');
const { BOSSES } = await vite.ssrLoadModule('/src/game/bosses.ts');
const { todayLocal } = await vite.ssrLoadModule('/src/game/survival.ts');
const { getBossAttackEntry, normalizeBossAttacks, resetBossAttacks, setBossAttackEntry } =
  await vite.ssrLoadModule('/src/game/bossAttacks.ts');

test('boss counters are independent and updates do not mutate the previous state', () => {
  const state = createInitialState();
  const updated = setBossAttackEntry(state, '1', { used: 2, purchased: 1 });
  assert.deepEqual(getBossAttackEntry(state, '1'), { used: 0, purchased: 0 });
  assert.deepEqual(getBossAttackEntry(updated, '1'), { used: 2, purchased: 1 });
  assert.deepEqual(getBossAttackEntry(updated, '2'), { used: 0, purchased: 0 });
});

test('boss counters reset at the local date boundary', () => {
  const now = new Date(2026, 3, 4, 23, 59, 59).getTime();
  const next = new Date(2026, 3, 5, 0, 0, 0).getTime();
  const state = { ...createInitialState(), bossAttacks: { date: todayLocal(now), entries: { '1': { used: 3, purchased: 1 } } } };
  assert.equal(resetBossAttacks(state, now), state);
  assert.deepEqual(resetBossAttacks(state, next).bossAttacks, { date: todayLocal(next), entries: {} });
});

test('saved per-boss counters are normalized and stale counters reset', () => {
  const today = todayLocal();
  assert.deepEqual(normalizeBossAttacks({ date: today, entries: { '1': { used: 2.8, purchased: -1 } } }),
    { date: today, entries: { '1': { used: 2, purchased: 0 } } });
  assert.deepEqual(normalizeBossAttacks({ date: '2000-01-01', entries: { '1': { used: 1, purchased: 1 } } }),
    { date: today, entries: {} });
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
