import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());

const { createInitialState } = await vite.ssrLoadModule('/src/game/initialState.ts');
const { gameReducer, hydrateState } = await vite.ssrLoadModule('/src/game/reducer.ts');
const { roomDropChance, BOSS_COUNTER_MS, BOSS_DURATION_MS, bossAttackPrice, todayLocal, BOSS_ATTACK_CONFIG } = await vite.ssrLoadModule('/src/game/survival.ts');

const act = (state, type, details = {}) => gameReducer(state, { type, ...details });

test('room chance rises with damage and never exceeds 50%', () => {
  assert.equal(roomDropChance(0), 0.05);
  assert.equal(roomDropChance(100), 0.1);
  assert.equal(roomDropChance(900), 0.5);
  assert.equal(roomDropChance(1e9), 0.5);
  assert.equal(roomDropChance(-100), 0.05);
  assert.equal(roomDropChance(NaN), 0.05);
});

test('a boss victory rolls a room; only an available drop can be claimed', () => {
  const initial = createInitialState();
  assert.deepEqual(initial.unlockedRooms, ['location1']);
  assert.equal(act(initial, 'CHANGE_LOCATION', { locationId: 'location2' }).currentLocation, 'location1');
  let state = act(initial, 'START_BOSS_FIGHT', { bossId: '1' });
  assert.equal(state.bossAttacks.entries['1'], undefined);
  state = { ...state, battle: { ...state.battle, bossHp: 1, damageDealt: 900 } };
  const random = Math.random;
  try {
    Math.random = () => 0;
    state = act(state, 'BOSS_SKILL', { skillId: 'jab', now: state.battle.startedAt + 1 });
  } finally {
    Math.random = random;
  }
  assert.equal(state.battle.outcome, 'won');
  assert.equal(state.battle.reward.roomChance, 0.5);
  assert.equal(state.battle.reward.dropped, true);
  assert.equal(state.pendingRoomDrop.roomId, 'location2');
  assert.deepEqual(state.unlockedRooms, ['location1']);
  const claimed = act(state, 'CLAIM_ROOM');
  assert.ok(claimed.unlockedRooms.includes('location2'));
  assert.equal(act(claimed, 'CLAIM_ROOM'), claimed);
  assert.equal(act(claimed, 'CHANGE_LOCATION', { locationId: 'location2' }).currentLocation, 'location2');
  const questBefore = claimed.daily.quests.find((quest) => quest.questId === 'q1').progress;
  const awarded = act(claimed, 'LEAVE_BATTLE');
  assert.equal(awarded.battle, null);
  assert.equal(awarded.daily.quests.find((quest) => quest.questId === 'q1').progress, questBefore + 1);
  assert.equal(awarded.bullets, claimed.battle.reward.bullets);
  assert.equal(act(awarded, 'LEAVE_BATTLE'), awarded);
});

test('an unsuccessful roll leaves the room locked', () => {
  let state = act(createInitialState(), 'START_BOSS_FIGHT', { bossId: '1' });
  state = { ...state, battle: { ...state.battle, bossHp: 1 } };
  const random = Math.random;
  try {
    Math.random = () => 0.99;
    state = act(state, 'BOSS_SKILL', { skillId: 'jab', now: state.battle.startedAt + 1 });
  } finally {
    Math.random = random;
  }
  assert.equal(state.battle.outcome, 'won');
  assert.equal(state.lastRoomRoll.dropped, false);
  assert.equal(state.pendingRoomDrop, null);
  assert.equal(act(state, 'CLAIM_ROOM'), state);
});

test('leaving a boss battle does not pause the boss; returning resumes it', () => {
  let state = act(createInitialState(), 'START_BOSS_FIGHT', { bossId: '2' });
  const start = state.battle.startedAt;
  state = act(state, 'LEAVE_BATTLE');
  assert.equal(state.battleVisible, false);
  assert.equal(state.battle.outcome, 'fighting');
  state = act(state, 'BOSS_TICK', { now: start + 2 * BOSS_COUNTER_MS });
  assert.ok(state.battle.playerHp < state.battle.playerMaxHp);
  assert.equal(state.battle.lastCounterAt, start + 2 * BOSS_COUNTER_MS);
  state = act(state, 'OPEN_BATTLE');
  assert.equal(state.battleVisible, true);
  assert.equal(state.battle.bossMaxHp, 250);
  state = act(state, 'BOSS_TICK', { now: start + BOSS_DURATION_MS + 1 });
  assert.equal(state.battle.outcome, 'lost');
  const hp = state.battle.bossHp;
  state = act(state, 'LEAVE_BATTLE');
  assert.equal(state.woundedBosses['2'], hp);
  assert.equal(state.battle, null);
});

test('timed boss attacks reset after two hours and extra attacks cost caps', () => {
  BOSS_ATTACK_CONFIG.timedLimits = true;
  try {
  const initial = createInitialState();
  const price = bossAttackPrice(5);
  let state = {
    ...initial,
    caps: price + 5,
    premiumGold: 10,
    bossAttacks: { date: todayLocal(), entries: { '1': { used: 5, purchased: 0 } } },
  };
  assert.equal(act(state, 'START_BOSS_FIGHT', { bossId: '1' }).battle, null);
  state = act(state, 'BUY_BOSS_ATTACK', { bossId: '1' });
  assert.equal(state.caps, 5);
  assert.equal(state.premiumGold, 10);
  assert.equal(state.bossAttacks.entries['1'].purchased, 1);
  assert.equal(act(state, 'BUY_BOSS_ATTACK', { bossId: '1' }).caps, 5);
  state = act(state, 'START_BOSS_FIGHT', { bossId: '1' });
  assert.equal(state.bossAttacks.entries['1'].used, 6);
  assert.equal(state.battle.source, 'boss');
  assert.equal(act(state, 'BATTLE_GRENADES', { count: 1 }), state);
  const reset = act({ ...state, battle: null }, 'BOSS_TICK', { now: state.bossAttacks.resetAt });
  assert.deepEqual(reset.bossAttacks.entries, {});
  assert.equal(reset.caps, 5);
  assert.equal(reset.premiumGold, 10);
  } finally { BOSS_ATTACK_CONFIG.timedLimits = false; }
});

test('raid awards matches, tasks award tokens and health, never donation gold', () => {
  let state = { ...createInitialState(), energy: 100, health: 40, premiumGold: 30 };
  state = act(state, 'START_RAID', { raidId: 'raid_1' });
  state = act(state, 'OPEN_RAID_TASKS', { raidId: 'raid_1' });
  state = act(state, 'COMPLETE_RAID_TASKS', { raidId: 'raid_1', mode: 'energy' });
  assert.equal(state.zhetons, 9);
  assert.equal(state.health, 75);
  assert.equal(state.premiumGold, 30);
  assert.equal(state.raidTasks.completedIds.length, 3);
  assert.equal(act(state, 'COMPLETE_RAID_TASKS', { raidId: 'raid_1', mode: 'gold' }).premiumGold, 30);
  state = act(state, 'CLOSE_RAID_TASKS');
  state = act(state, 'START_RAID', { raidId: 'raid_2' });
  state = act(state, 'OPEN_RAID_TASKS', { raidId: 'raid_2' });
  assert.equal(state.raidTasks.completedIds.length, 0);
  state = act(state, 'COMPLETE_RAID_TASKS', { raidId: 'raid_2', mode: 'gold' });
  assert.equal(state.premiumGold, 0);
  assert.equal(state.zhetons, 18);
  state = act(state, 'START_RAID', { raidId: 'raid_1' });
  state = act(state, 'OPEN_RAID_TASKS', { raidId: 'raid_1' });
  assert.equal(state.raidTasks.completedIds.length, 3);
  const before = state.premiumGold;
  const startedAt = state.mapRaids.find((raid) => raid.id === 'raid_1').endTime;
  const realNow = Date.now;
  try {
    Date.now = () => startedAt + 1;
    state = act(state, 'CLAIM_RAID_REWARD', { raidId: 'raid_1' });
  } finally {
    Date.now = realNow;
  }
  assert.equal(state.premiumGold, before);
  assert.equal(state.matches, 12);
});

test('solo tasks produce tokens, while routine earnings never produce premium gold', () => {
  let state = { ...createInitialState(), energy: 100 };
  state = act(state, 'DO_TASK', { taskId: 'sg1' });
  assert.equal(state.premiumGold, 0);
  assert.equal(state.bullets, 0);
  assert.equal(state.matches, 0);
  state = act(state, 'CLAIM_DAILY');
  assert.equal(state.premiumGold, 0);
});

test('old saves preserve their current room and get safe new defaults', () => {
  const previous = createInitialState();
  previous.currentLocation = 'location4';
  delete previous.unlockedRooms;
  delete previous.premiumGold;
  delete previous.bossAttacks;
  delete previous.raidTaskProgress;
  const loaded = hydrateState(previous);
  assert.ok(loaded.unlockedRooms.includes('location1'));
  assert.ok(loaded.unlockedRooms.includes('location4'));
  assert.equal(loaded.premiumGold, 0);
  assert.deepEqual(loaded.raidTaskProgress, {});
  assert.equal(act(loaded, 'CHANGE_LOCATION', { locationId: 'location4' }).currentLocation, 'location4');
});

test('boss energy charges on successful hits and powers a strong attack', () => {
  let state = act(createInitialState(), 'START_BOSS_FIGHT', { bossId: '1' });
  state = { ...state, battle: { ...state.battle, bossHp: 10000, bossMaxHp: 10000 } };
  const now = state.battle.startedAt + 1;
  assert.equal(state.battle.bossEnergy, 0);
  const tooEarly = act(state, 'BOSS_POWER_ATTACK', { now });
  assert.equal(tooEarly.battle.bossHp, state.battle.bossHp);
  for (let i = 0; i < 6; i++) state = act(state, 'BOSS_SKILL', { skillId: 'jab', now: now + i });
  assert.equal(state.battle.bossEnergy, 100);
  const hp = state.battle.bossHp;
  const total = state.battle.damageDealt;
  state = act(state, 'BOSS_POWER_ATTACK', { now: now + 10 });
  assert.equal(state.battle.bossEnergy, 0);
  assert.ok(hp - state.battle.bossHp > 8);
  assert.equal(state.battle.damageDealt - total, hp - state.battle.bossHp);
  assert.equal(act(state, 'BOSS_POWER_ATTACK', { now: now + 11 }).battle.bossHp, state.battle.bossHp);
});

test('test mode allows attacking an exhausted boss without consuming or buying attacks', () => {
  let state = { ...createInitialState(), caps: 100, bossAttacks: { date: todayLocal(), entries: { '1': { used: 999, purchased: 1 } } } };
  const before = state.bossAttacks;
  const bought = act(state, 'BUY_BOSS_ATTACK', { bossId: '1' });
  assert.equal(bought.caps, 100);
  assert.equal(bought.bossAttacks, before);
  state = act(bought, 'START_BOSS_FIGHT', { bossId: '1' });
  assert.equal(state.battle.source, 'boss');
  assert.equal(state.bossAttacks, before);
});
