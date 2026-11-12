import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const { createInitialState } = await vite.ssrLoadModule('/src/game/initialState.ts');
const { gameReducer, hydrateState } = await vite.ssrLoadModule('/src/game/reducer.ts');
const { EXTRA_MAP_RAIDS, normalizeMapRaids } = await vite.ssrLoadModule('/src/game/extraMapRaids.ts');

test('old saves gain four new routes without resetting existing raids or danger tasks', () => {
  const original = createInitialState();
  const old = { ...original, mapRaids: original.mapRaids.slice(0, 7).map((r, i) => i === 0 ? { ...r, isRunning: true, startTime: 10, endTime: 9999999999999 } : r), raidTaskProgress: { raid_1: ['first'] } };
  const migrated = hydrateState(old);
  assert.equal(migrated.mapRaids.length, 11);
  assert.equal(migrated.mapRaids[0].endTime, 9999999999999);
  assert.deepEqual(migrated.raidTaskProgress, { raid_1: ['first'] });
  assert.equal(normalizeMapRaids(migrated).mapRaids.length, 11);
});

test('new routes enforce each car threshold without spending energy; old routes remain open', () => {
  for (const raid of EXTRA_MAP_RAIDS) {
    const base = { ...createInitialState(), energy: 100, carLevel: raid.requiredCarLevel - 1 };
    const locked = gameReducer(base, { type: 'START_RAID', raidId: raid.id });
    assert.equal(locked.energy, 100); assert.equal(locked.mapRaids.find(r => r.id === raid.id).isRunning, false);
    const unlocked = gameReducer({ ...base, carLevel: raid.requiredCarLevel }, { type: 'START_RAID', raidId: raid.id });
    assert.equal(unlocked.energy, 100 - raid.energyCost); assert.equal(unlocked.mapRaids.find(r => r.id === raid.id).isRunning, true);
    const running = unlocked.mapRaids.find(r => r.id === raid.id);
    assert.equal(running.endTime - running.startTime, (raid.type === 'red' ? 30 : 15) * 60000);
    const done = { ...unlocked, mapRaids: unlocked.mapRaids.map(r => r.id === raid.id ? { ...r, endTime: Date.now() - 1 } : r) };
    const collected = gameReducer(done, { type: 'CLAIM_RAID_REWARD', raidId: raid.id });
    assert.equal(collected.matches, done.matches + raid.rewards.matches);
    assert.equal(collected.keys, done.keys + raid.rewards.materials);
    assert.equal(gameReducer(collected, { type: 'CLAIM_RAID_REWARD', raidId: raid.id }).matches, collected.matches);
  }
  const old = gameReducer({ ...createInitialState(), carLevel: 1, energy: 100 }, { type: 'START_RAID', raidId: 'raid_5' });
  assert.equal(old.mapRaids.find(r => r.id === 'raid_5').isRunning, true);
});

test('saved routes retain progress but cannot change the rules or duplicate rewards', () => {
  const raid = EXTRA_MAP_RAIDS[0];
  const state = createInitialState();
  const modified = { ...state, mapRaids: state.mapRaids.map(r => r.id === raid.id ? { ...r, requiredCarLevel: 1, rewards: { bullets: 0, matches: 99999, materials: 99999 }, isRunning: true, startTime: 1, endTime: 2 } : r) };
  const normalized = normalizeMapRaids(modified).mapRaids.find(r => r.id === raid.id);
  assert.equal(normalized.requiredCarLevel, 10); assert.equal(normalized.rewards.matches, raid.rewards.matches);
  assert.equal(normalized.startTime, 1); assert.equal(normalized.endTime, 2);
});
