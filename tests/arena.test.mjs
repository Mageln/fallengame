import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const { createInitialState } = await vite.ssrLoadModule('/src/game/initialState.ts');
const { reduceArena, arenaAttemptsLeft, ARENA_OPPONENTS } = await vite.ssrLoadModule('/src/game/arena.ts');
const { gameReducer, hydrateState } = await vite.ssrLoadModule('/src/game/reducer.ts');
after(() => vite.close());
const time = Date.UTC(2026, 0, 1, 12);
const start = (state, opponentId = 'raider', now = time) => reduceArena(state, { type: 'START_ARENA', opponentId }, now);
const skill = (state, skillId) => reduceArena(state, { type: 'ARENA_SKILL', skillId }, time);
const close = (state) => reduceArena(state, { type: 'CLOSE_ARENA_BATTLE' }, time);

test('attempts are charged on start, persist across reload, and reset next UTC day', () => {
  let state = createInitialState();
  const invalid = start(state, 'fake');
  assert.equal(invalid, state);
  for (let i = 0; i < 5; i++) {
    state = start(state);
    assert.equal(arenaAttemptsLeft(state.arena, time), 4 - i);
    state = hydrateState(JSON.parse(JSON.stringify(state)));
    assert.equal(state.arena.battle.outcome, 'fighting');
    state = close(state);
  }
  assert.equal(start(state).arena.battle, null);
  assert.equal(arenaAttemptsLeft(state.arena, time + 86_400_000), 5);
  state = start(state, 'guard', time + 86_400_000);
  assert.equal(state.arena.used, 1);
});

test('skills cost energy, block, heal, and each successful action triggers a counter', () => {
  let state = start(createInitialState());
  const hp = state.arena.battle.playerHp;
  const unavailable = skill(state, 'weapon');
  assert.equal(unavailable.arena.battle.turn, 1);
  state = skill(state, 'jab');
  assert.equal(state.arena.battle.energy, 20);
  assert.ok(state.arena.battle.playerHp < hp);
  const beforeBlock = state.arena.battle.playerHp;
  state = skill(state, 'block');
  assert.equal(state.arena.battle.energy, 0);
  assert.ok(beforeBlock - state.arena.battle.playerHp < hp - unavailable.arena.battle.playerHp + Math.round(hp * 0.055));
  for (let i = 0; i < 3; i++) state = skill(state, 'jab');
  const beforeHeal = state.arena.battle.playerHp;
  state = skill(state, 'heal');
  assert.equal(state.arena.battle.energy, 10);
  assert.ok(state.arena.battle.playerHp > beforeHeal);
});

test('victory rewards once, retreat pays nothing, and normal HP is unchanged', () => {
  let state = createInitialState();
  const initial = state;
  state = start(state);
  let steps = 0;
  while (state.arena.battle.outcome === 'fighting' && steps++ < 40) state = skill(state, state.arena.battle.energy >= 10 ? 'weapon' : 'jab');
  assert.equal(state.arena.battle.outcome, 'won');
  assert.equal(state.gold, initial.gold + ARENA_OPPONENTS[0].gold);
  assert.equal(state.bullets, initial.bullets + ARENA_OPPONENTS[0].bullets);
  assert.equal(state.health, initial.health);
  assert.equal(skill(state, 'jab').gold, state.gold);
  state = close(state);
  assert.equal(close(state).gold, state.gold);
  const retreat = close(start(initial));
  assert.equal(retreat.gold, initial.gold);
  let losing = start(initial);
  losing = { ...losing, arena: { ...losing.arena, battle: { ...losing.arena.battle, playerHp: 1 } } };
  losing = skill(losing, 'jab');
  assert.equal(losing.arena.battle.outcome, 'fighting');
  assert.equal(losing.arena.battle.playerHp, 1);
  assert.equal(losing.gold, initial.gold);
  losing = { ...losing, arena: { ...losing.arena, battle: { ...losing.arena.battle, turn: 50 } } };
  losing = skill(losing, 'jab');
  assert.equal(losing.arena.battle.outcome, 'fighting');
  assert.equal(losing.arena.battle.turn, 51);
});

test('existing battles block arena and ongoing arena blocks starting other battles', () => {
  const initial = createInitialState();
  const arena = start(initial);
  const boss = gameReducer(arena, { type: 'START_BOSS_FIGHT', bossId: '1' });
  assert.equal(boss.battle, null);
  assert.equal(boss.arena.battle.outcome, 'fighting');
  const regularBattle = gameReducer(initial, { type: 'START_BOSS_FIGHT', bossId: '1' });
  assert.ok(regularBattle.battle);
  assert.equal(start(regularBattle).arena.battle, null);
});

test('opponent traits act on every third turn and character stats are snapshotted', () => {
  let guard = start(createInitialState(), 'guard');
  const fist = guard.arena.battle.fistDamage;
  guard = skill(skill(guard, 'jab'), 'jab');
  const before = guard.arena.battle.opponentHp;
  guard = skill({ ...guard, level: 999 }, 'jab');
  assert.equal(before - guard.arena.battle.opponentHp, Math.round(fist * 0.6));
  assert.match(guard.arena.battle.log.at(-2), /блокирует/);
  let medic = start(createInitialState(), 'medic');
  medic = skill(skill(skill(medic, 'jab'), 'jab'), 'jab');
  assert.ok(medic.arena.battle.log.some((entry) => entry.includes('Противник восстановил')));
});

test('arena requires neither health nor medkits and allows broken weapons', () => {
  const initial = createInitialState();
  let state = start({ ...initial, health: 0, medkits: 0, weapon: { ...initial.weapon, broken: true } });
  assert.equal(state.arena.battle.playerHp, state.arena.battle.playerMaxHp);
  state = skill(state, 'jab');
  const before = state.arena.battle.opponentHp;
  state = skill(state, 'weapon');
  assert.ok(state.arena.battle.opponentHp < before);
  assert.equal(state.health, 0);
  assert.equal(state.medkits, 0);
});

test('arena enemy stays enraged after crossing half HP even if a medic heals back above half', () => {
  let state = start(createInitialState(), 'medic');
  state = { ...state, arena: { ...state.arena, battle: { ...state.arena.battle,
    opponentMaxHp: 100, opponentHp: 51, turn: 3, fistDamage: 1 } } };
  state = skill(state, 'jab');
  assert.equal(state.arena.battle.opponentHp, 54);
  assert.equal(state.arena.battle.enraged, true);
  assert.ok(state.arena.battle.log.some((line) => line.includes('ярость')));
  state = hydrateState(JSON.parse(JSON.stringify(state)));
  assert.equal(state.arena.battle.enraged, true);
  state = skill(state, 'jab');
  assert.equal(state.arena.battle.enraged, true);
  assert.equal(state.arena.battle.log.filter((line) => line.includes('ярость')).length, 1);
});
