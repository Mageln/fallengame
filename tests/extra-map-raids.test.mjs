import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const { createInitialState } = await vite.ssrLoadModule('/src/game/initialState.ts');
const { gameReducer, hydrateState } = await vite.ssrLoadModule('/src/game/reducer.ts');
const { EXTRA_MAP_RAIDS, RAID_REGIONS, normalizeMapRaids } = await vite.ssrLoadModule('/src/game/extraMapRaids.ts');

test('old saves gain four new routes without resetting existing raids or danger tasks', () => {
  const original = createInitialState();
  const old = { ...original, mapRaids: original.mapRaids.slice(0, 7).map((r, i) => i === 0 ? { ...r, isRunning: true, startTime: 10, endTime: 9999999999999 } : r), raidTaskProgress: { raid_1: ['first'] } };
  const migrated = hydrateState(old);
  assert.equal(migrated.mapRaids.length, 23);
  assert.equal(migrated.mapRaids[0].endTime, 9999999999999);
  assert.deepEqual(migrated.raidTaskProgress, { raid_1: ['first'] });
  assert.equal(normalizeMapRaids(migrated).mapRaids.length, 23);
});

test('new routes enforce each car threshold without spending energy; old routes remain open', () => {
  for (const raid of EXTRA_MAP_RAIDS) {
    const base = { ...createInitialState(), energy: 100, carLevel: raid.requiredCarLevel - 1 };
    const locked = gameReducer(base, { type: 'START_RAID', raidId: raid.id });
    assert.equal(locked.energy, 100); assert.equal(locked.mapRaids.find(r => r.id === raid.id).isRunning, false);
    const region = RAID_REGIONS.find(r => r.raids.includes(raid.id));
    const eligible = gameReducer({ ...base, carLevel: raid.requiredCarLevel }, { type: 'UNLOCK_RAID_REGION', regionId: region.id });
    const unlocked = gameReducer(eligible, { type: 'START_RAID', raidId: raid.id });
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


test('each location has its own map and four distinct raids', async () => {
  const { access } = await import('node:fs/promises');
  assert.deepEqual(RAID_REGIONS.map(r => r.carLevel), [10, 20, 35, 50]);
  assert.equal(new Set(EXTRA_MAP_RAIDS.map(r => r.id)).size, 16);
  for (const region of RAID_REGIONS) {
    await access(`public${region.image}`);
    assert.equal(region.raids.length, 4);
    for (const id of region.raids) assert.equal(EXTRA_MAP_RAIDS.find(r => r.id === id).requiredCarLevel, region.carLevel);
  }
});

test('existing region raid timers and task progress survive migration to four points', () => {
  const state = createInitialState();
  const old = { ...state, mapRaids: state.mapRaids.filter(r => !RAID_REGIONS.flatMap(region => region.raids.slice(1)).includes(r.id)).map(r => r.id === 'raid_railway' ? { ...r, isRunning: true, startTime: 1, endTime: 1234 } : r), raidTaskProgress: { raid_railway: ['a'] } };
  const result = hydrateState(old);
  assert.equal(result.mapRaids.find(r => r.id === 'raid_railway').endTime, 1234);
  assert.deepEqual(result.raidTaskProgress.raid_railway, ['a']);
  assert.equal(result.mapRaids.length, 23);
});


test('map unlock checks car level, persists, and refuses bypass or unknown region', () => {
  for (const region of RAID_REGIONS) {
    const base = { ...createInitialState(), carLevel: region.carLevel - 1, energy: 100 };
    const locked = gameReducer(base, { type: 'UNLOCK_RAID_REGION', regionId: region.id });
    assert.ok(!locked.unlockedRaidRegions.includes(region.id));
    assert.equal(locked.energy, 100);
    const bypass = gameReducer({ ...base, carLevel: region.carLevel }, { type: 'START_RAID', raidId: region.raids[0] });
    assert.equal(bypass.energy, 100);
    const open = gameReducer({ ...base, carLevel: region.carLevel }, { type: 'UNLOCK_RAID_REGION', regionId: region.id });
    assert.ok(open.unlockedRaidRegions.includes(region.id));
    assert.ok(hydrateState(JSON.parse(JSON.stringify(open))).unlockedRaidRegions.includes(region.id));
  }
  const state = createInitialState();
  assert.equal(gameReducer(state, { type: 'UNLOCK_RAID_REGION', regionId: 'unknown' }), state);
});

test('legacy active and completed region raids remain accessible after migration', () => {
  const state = createInitialState();
  delete state.unlockedRaidRegions;
  state.mapRaids = state.mapRaids.map(r => r.id === 'raid_farm' ? { ...r, isRunning: true, endTime: 1234 } : r);
  const migrated = hydrateState(state);
  assert.ok(migrated.unlockedRaidRegions.includes('farm'));
  assert.equal(migrated.mapRaids.find(r => r.id === 'raid_farm').endTime, 1234);
});
