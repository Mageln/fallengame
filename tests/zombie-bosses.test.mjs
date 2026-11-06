import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());
const { gameReducer, hydrateState } = await vite.ssrLoadModule('/src/game/reducer.ts');
const { createInitialState } = await vite.ssrLoadModule('/src/game/initialState.ts');
const { advanceBossClock } = await vite.ssrLoadModule('/src/game/battleEngine.ts');
const { getBoss } = await vite.ssrLoadModule('/src/game/bosses.ts');
const { getBossArt, isEnraged } = await vite.ssrLoadModule('/src/game/enemyArt.ts');
const { BOSS_COUNTER_MS } = await vite.ssrLoadModule('/src/game/survival.ts');

const start = (id) => {
  const state = gameReducer(createInitialState(), { type: 'START_BOSS_FIGHT', bossId: id });
  assert.equal(state.battle.bossId, id);
  return { ...state, battle: { ...state.battle, playerHp: 1000, playerMaxHp: 1000 } };
};
const tick = (state, count) => advanceBossClock(state, state.battle.startedAt + count * BOSS_COUNTER_MS);

test('ordinary zombie only uses normal attacks', () => {
  let state = start('zombie');
  const damage = getBoss('zombie').damage;
  for (let i = 1; i <= 4; i++) {
    state = tick(state, i);
    assert.equal(state.battle.playerHp, 1000 - damage * i);
    assert.match(state.battle.log.at(-1), /Обычная атака/);
  }
});

test('brute has a double-damage attack every third strike and stays in sequence after reload', () => {
  let state = start('zombie_brute');
  const damage = getBoss('zombie_brute').damage;
  state = tick(state, 1);
  assert.match(state.battle.log.at(-1), /Обычная атака/);
  state = tick(state, 2);
  state = hydrateState(JSON.parse(JSON.stringify(state)));
  state = tick(state, 3);
  assert.equal(state.battle.playerHp, 1000 - damage * 4);
  assert.match(state.battle.log.at(-1), /Сильная атака/);
  state = tick(state, 4);
  assert.match(state.battle.log.at(-1), /Обычная атака/);
});

test('batching offline attacks and blocking a strong attack work consistently', () => {
  const initial = start('zombie_brute');
  const batched = tick(initial, 6);
  let separate = initial;
  for (let i = 1; i <= 6; i++) separate = tick(separate, i);
  assert.equal(batched.battle.playerHp, separate.battle.playerHp);
  assert.match(batched.battle.log.at(-1), /обычных 4, сильных 2/);
  let blocked = tick(initial, 2);
  blocked = { ...blocked, battle: { ...blocked.battle, blocking: true } };
  blocked = tick(blocked, 3);
  assert.equal(blocked.battle.playerHp, 1000 - 28 - (28 - Math.floor(28 * 0.6)));
  assert.equal(blocked.battle.blocking, false);
  assert.match(blocked.battle.log.at(-1), /Сильная атака.*блок/);
});

test('both zombies keep existing battle rules, phase, retreat and victory rewards', () => {
  for (const id of ['zombie', 'zombie_brute']) {
    let state = start(id);
    const max = state.battle.bossMaxHp;
    state = { ...state, battle: { ...state.battle, bossHp: max / 2 } };
    state = hydrateState(JSON.parse(JSON.stringify(state)));
    assert.ok(isEnraged(state.battle.bossHp, max));
    assert.notEqual(getBossArt(id).normal, getBossArt(id).enraged);
    const retreated = gameReducer(state, { type: 'ABANDON_BOSS' });
    assert.equal(retreated.woundedBosses[id], max / 2);
    const resumed = gameReducer(retreated, { type: 'START_BOSS_FIGHT', bossId: id });
    assert.equal(resumed.battle.bossHp, max / 2);
    assert.ok(isEnraged(resumed.battle.bossHp, resumed.battle.bossMaxHp));
    state = { ...resumed, battle: { ...resumed.battle, bossHp: 1, playerHp: 1 } };
    state = gameReducer(state, { type: 'BOSS_SKILL', skillId: 'jab', now: state.battle.startedAt });
    assert.equal(state.battle.outcome, 'won');
    assert.equal(state.battle.reward.bullets, getBoss(id).reward.bullets);
  }
});
