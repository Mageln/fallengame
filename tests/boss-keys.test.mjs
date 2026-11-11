import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const { createInitialState } = await vite.ssrLoadModule('/src/game/initialState.ts');
const { gameReducer, hydrateState } = await vite.ssrLoadModule('/src/game/reducer.ts');
const { BOSS_KEY_ORDER, BOSS_KEY_PRICES, nextBossKeyFor } = await vite.ssrLoadModule('/src/game/bossKeys.ts');
const { BossHub } = await vite.ssrLoadModule('/src/panels/Boss.tsx');
const { GameContext } = await vite.ssrLoadModule('/src/game/GameContext.tsx');
const act = (state, type, extra = {}) => gameReducer(state, { type, ...extra });

test('boss chain is explicit, first is free and keys are specific to each boss', () => {
  assert.deepEqual([...BOSS_KEY_ORDER], ['zombie', 'zombie_brute', '1', '2', '3', '4']);
  assert.deepEqual(BOSS_KEY_PRICES, { zombie_brute: 100, '1': 200, '2': 300, '3': 400, '4': 500 });
  const state = { ...createInitialState(), keys: 10, bossKeys: { '2': 3 } };
  const blocked = act(state, 'START_BOSS_FIGHT', { bossId: '1' });
  assert.equal(blocked.battle, null); assert.equal(blocked.keys, 10); assert.equal(blocked.bossKeys['2'], 3);
  const free = act(state, 'START_BOSS_FIGHT', { bossId: 'zombie' });
  assert.equal(free.battle.bossId, 'zombie'); assert.equal(free.keys, 10);
});

test('purchase uses only premium balance, known price and cannot buy invalid keys', () => {
  const state = { ...createInitialState(), gold: 999, caps: 999, premiumGold: 300 };
  const a = act(state, 'BUY_BOSS_KEY', { bossId: 'zombie_brute' });
  assert.equal(a.premiumGold, 200); assert.equal(a.bossKeys.zombie_brute, 1);
  assert.equal(a.gold, 999); assert.equal(a.caps, 999);
  const b = act(a, 'BUY_BOSS_KEY', { bossId: '1' });
  assert.equal(b.premiumGold, 0); assert.equal(b.bossKeys['1'], 1);
  const insufficient = act(b, 'BUY_BOSS_KEY', { bossId: '2' });
  assert.equal(insufficient.premiumGold, 0); assert.equal(insufficient.bossKeys['2'], undefined);
  assert.deepEqual(act(state, 'BUY_BOSS_KEY', { bossId: 'zombie' }), state);
  assert.deepEqual(act(state, 'BUY_BOSS_KEY', { bossId: '__proto__' }), state);
  const malformed = act({ ...state, premiumGold: undefined }, 'BUY_BOSS_KEY', { bossId: '1' });
  assert.equal(malformed.bossKeys['1'], undefined);
});

test('starting spends one key, reopening does not, retreat does not refund', () => {
  let state = { ...createInitialState(), bossKeys: { zombie_brute: 1 } };
  state = act(state, 'START_BOSS_FIGHT', { bossId: 'zombie_brute' });
  assert.equal(state.bossKeys.zombie_brute, 0); assert.ok(state.battle);
  state = act(state, 'LEAVE_BATTLE'); assert.equal(state.battleVisible, false);
  state = act(state, 'START_BOSS_FIGHT', { bossId: 'zombie_brute' });
  assert.equal(state.battleVisible, true); assert.equal(state.bossKeys.zombie_brute, 0);
  state = act(state, 'ABANDON_BOSS'); assert.equal(state.battle, null); assert.equal(state.bossKeys.zombie_brute, 0);
  state = act(state, 'START_BOSS_FIGHT', { bossId: 'zombie_brute' });
  assert.equal(state.battle, null);
});

test('a failed start during arena does not spend a key', () => {
  let state = { ...createInitialState(), bossKeys: { zombie_brute: 1 } };
  state = act(state, 'START_ARENA', { opponentId: 'raider' });
  const result = act(state, 'START_BOSS_FIGHT', { bossId: 'zombie_brute' });
  assert.equal(result.battle, null); assert.equal(result.bossKeys.zombie_brute, 1);
});

test('every victory grants exactly one next key across save reload, final boss has none', () => {
  let state = createInitialState();
  for (const [i, bossId] of BOSS_KEY_ORDER.entries()) {
    state = act(state, 'START_BOSS_FIGHT', { bossId });
    assert.equal(state.battle?.bossId, bossId);
    state = { ...state, battle: { ...state.battle, bossHp: 1 } };
    state = act(state, 'BOSS_SKILL', { skillId: 'jab', now: state.battle.startedAt });
    const next = nextBossKeyFor(bossId);
    assert.equal(state.battle.outcome, 'won'); assert.equal(state.battle.reward.nextBossKey, next);
    state = hydrateState(JSON.parse(JSON.stringify(state)));
    state = act(state, 'LEAVE_BATTLE');
    if (next) assert.equal(state.bossKeys[next], 1, `key after boss ${i}`);
    const after = JSON.stringify(state.bossKeys);
    state = act(state, 'LEAVE_BATTLE'); assert.equal(JSON.stringify(state.bossKeys), after);
  }
});

test('legacy saves preserve their balances and do not reinterpret existing generic keys', () => {
  const old = { ...createInitialState(), keys: 9, premiumGold: 200 }; delete old.bossKeys;
  const hydrated = hydrateState(old);
  assert.equal(hydrated.keys, 9); assert.equal(hydrated.premiumGold, 200); assert.deepEqual(hydrated.bossKeys, {});
});

test('boss hub shows order, key count and premium price', () => {
  const state = createInitialState();
  const value = { state, dispatch: () => {}, derived: {}, vkUser: null, isLoading: false, serverMode: false };
  const html = renderToStaticMarkup(React.createElement(GameContext.Provider, { value }, React.createElement(BossHub, { onClose: () => {} })));
  assert.ok(html.indexOf('Обычный зомби') < html.indexOf('Зомби-громила'));
  assert.ok(html.indexOf('Зомби-громила') < html.indexOf('Михалыч'));
  assert.match(html, /Первый босс · ключ не нужен/); assert.match(html, /КУПИТЬ КЛЮЧ/);
  assert.match(html, /Премиум-золото/); assert.match(html, /100%/);
});
