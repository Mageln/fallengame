import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());

const { createInitialState } = await vite.ssrLoadModule('/src/game/initialState.ts');
const { gameReducer, hydrateState } = await vite.ssrLoadModule('/src/game/reducer.ts');

test('rooms stay locked until their boss is defeated', () => {
  const initial = createInitialState();
  assert.deepEqual(initial.unlockedRooms, ['location1']);
  const locked = gameReducer(initial, { type: 'CHANGE_LOCATION', locationId: 'location2' });
  assert.equal(locked.currentLocation, 'location1');
  assert.equal(gameReducer(initial, { type: 'CHANGE_LOCATION', locationId: 'unknown' }).currentLocation, 'location1');

  let state = gameReducer({ ...initial, grenades: 2 }, { type: 'START_BOSS_FIGHT', bossId: '1' });
  state = { ...state, battle: { ...state.battle, bossHp: 1 } };
  const random = Math.random;
  try {
    Math.random = () => 0;
    state = gameReducer(state, { type: 'BATTLE_GRENADES', count: 1 });
  } finally {
    Math.random = random;
  }
  assert.equal(state.battle.outcome, 'won');
  assert.equal(state.grenades, 1);
  assert.ok(state.unlockedRooms.includes('location2'));
  assert.equal(state.battle.reward.room, 'location2');
  assert.equal(state.battle.lastHit.damage, 12);
  assert.ok(state.battle.log.some((line) => line.includes('Гранаты x1')));

  const questBefore = state.daily.quests.find((quest) => quest.questId === 'q1').progress;
  state = gameReducer(state, { type: 'LEAVE_BATTLE' });
  assert.equal(state.battle, null);
  assert.equal(state.daily.quests.find((quest) => quest.questId === 'q1').progress, questBefore + 1);
  state = gameReducer(state, { type: 'CHANGE_LOCATION', locationId: 'location2' });
  assert.equal(state.currentLocation, 'location2');
  assert.equal(gameReducer(state, { type: 'CHANGE_LOCATION', locationId: 'location3' }).currentLocation, 'location2');
});

test('retreat retains damage and the original boss health bar', () => {
  let state = gameReducer(createInitialState(), { type: 'START_BOSS_FIGHT', bossId: '2' });
  state = { ...state, battle: { ...state.battle, bossHp: 75 } };
  state = gameReducer(state, { type: 'LEAVE_BATTLE' });
  assert.equal(state.woundedBosses['2'], 75);
  state = gameReducer(state, { type: 'START_BOSS_FIGHT', bossId: '2' });
  assert.equal(state.battle.bossHp, 75);
  assert.equal(state.battle.bossMaxHp, 250);
});

test('turn limit preserves boss damage for a later attempt', () => {
  let state = gameReducer({ ...createInitialState(), grenades: 1 }, { type: 'START_BOSS_FIGHT', bossId: '1' });
  state = { ...state, battle: { ...state.battle, turnLimit: 1 } };
  const random = Math.random;
  try {
    Math.random = () => 0;
    state = gameReducer(state, { type: 'BATTLE_GRENADES', count: 1 });
  } finally {
    Math.random = random;
  }
  assert.equal(state.battle, null);
  assert.equal(state.woundedBosses['1'], 88);
  state = gameReducer(state, { type: 'START_BOSS_FIGHT', bossId: '1' });
  assert.equal(state.battle.bossHp, 88);
  assert.equal(state.battle.bossMaxHp, 100);
});

test('grenades cannot be reused or spent after victory', () => {
  let state = gameReducer({ ...createInitialState(), grenades: 1 }, { type: 'START_BOSS_FIGHT', bossId: '1' });
  assert.equal(gameReducer(state, { type: 'BATTLE_GRENADES', count: 0 }).grenades, 1);
  assert.equal(gameReducer(state, { type: 'BATTLE_GRENADES', count: 2 }).grenades, 1);
  state = { ...state, battle: { ...state.battle, bossHp: 1 } };
  const random = Math.random;
  try {
    Math.random = () => 0;
    state = gameReducer(state, { type: 'BATTLE_GRENADES', count: 1 });
  } finally {
    Math.random = random;
  }
  assert.equal(state.grenades, 0);
  assert.equal(gameReducer(state, { type: 'BATTLE_GRENADES', count: 1 }), state);
  assert.equal(gameReducer(state, { type: 'BATTLE_HEAL' }), state);
});

test('old saves preserve their current room', () => {
  const previous = createInitialState();
  previous.currentLocation = 'location4';
  delete previous.unlockedRooms;
  const loaded = hydrateState(previous);
  assert.ok(loaded.unlockedRooms.includes('location1'));
  assert.ok(loaded.unlockedRooms.includes('location4'));
  assert.equal(gameReducer(loaded, { type: 'CHANGE_LOCATION', locationId: 'location4' }).currentLocation, 'location4');
});
