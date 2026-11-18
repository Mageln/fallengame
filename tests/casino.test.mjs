import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const { createInitialState } = await vite.ssrLoadModule('/src/game/initialState.ts');
const { gameReducer, hydrateState } = await vite.ssrLoadModule('/src/game/reducer.ts');
const { normalizeCasino, casinoBadge } = await vite.ssrLoadModule('/src/game/casino.ts');
const { GameContext } = await vite.ssrLoadModule('/src/game/GameContext.tsx');
const { CasinoModal } = await vite.ssrLoadModule('/src/panels/Casino.tsx');
const withRandom = (rolls, f) => { const original = Math.random; let i = 0; Math.random = () => rolls[i++ % rolls.length]; try { return f(); } finally { Math.random = original; } };

test('old saves are migrated without changing previous progress', () => {
  const state = createInitialState(); state.gold = 321; delete state.casino;
  const hydrated = hydrateState(state);
  assert.equal(hydrated.gold, 321); assert.deepEqual(hydrated.casino, normalizeCasino());
  const legacyAction = withRandom([0], () => gameReducer(state, { type: 'CASINO_SAFE', choice: 0 }));
  assert.equal(legacyAction.casino.chips, 10); assert.equal(legacyAction.gold, 321);
});

test('free safe grants one reward per UTC day and cannot be farmed by switching safes', () => {
  const start = createInitialState();
  const first = withRandom([0], () => gameReducer(start, { type: 'CASINO_SAFE', choice: 2 }));
  assert.equal(first.casino.chips, 10); assert.equal(first.bullets, 10);
  assert.equal(first.premiumGold, start.premiumGold); assert.equal(first.caps, start.caps);
  const second = gameReducer(first, { type: 'CASINO_SAFE', choice: 1 });
  assert.equal(second.casino.chips, 10); assert.equal(second.bullets, 10);
  const invalid = gameReducer(start, { type: 'CASINO_SAFE', choice: 3 });
  assert.equal(invalid.casino.chips, 0);
  const tomorrow = { ...first, casino: { ...first.casino, lastSafeDate: '2000-01-01' } };
  const next = withRandom([0.4], () => gameReducer(tomorrow, { type: 'CASINO_SAFE', choice: 0 }));
  assert.equal(next.casino.chips, 20); assert.equal(next.matches, 5);
});

test('slots use isolated chips, pay expected outcomes and refuse unaffordable bets', () => {
  const start = createInitialState();
  assert.equal(gameReducer(start, { type: 'CASINO_SLOTS' }).casino.chips, 0);
  const state = { ...start, casino: { ...start.casino, chips: 10 } };
  const jackpot = withRandom([0.9, 0.9, 0.9], () => gameReducer(state, { type: 'CASINO_SLOTS' }));
  assert.equal(jackpot.casino.chips, 35); assert.equal(jackpot.casino.points, 1); assert.equal(jackpot.casino.reels.join(''), '📻📻📻');
  const pair = withRandom([0, 0, 0.3], () => gameReducer(state, { type: 'CASINO_SLOTS' }));
  assert.equal(pair.casino.chips, 8);
  const lose = withRandom([0, 0.3, 0.6], () => gameReducer(state, { type: 'CASINO_SLOTS' }));
  assert.equal(lose.casino.chips, 5);
  for (const key of ['gold', 'premiumGold', 'zhetons', 'caps', 'energy', 'bullets']) assert.equal(jackpot[key], state[key]);
});

test('cards and cosmetic badges are validated and badges appear in profile data', () => {
  const base = createInitialState();
  const state = { ...base, casino: { ...base.casino, chips: 5, points: 15 } };
  assert.equal(gameReducer(state, { type: 'CASINO_CARD', choice: -1 }).casino.chips, 5);
  const card = withRandom([0.9], () => gameReducer(state, { type: 'CASINO_CARD', choice: 1 }));
  assert.equal(card.casino.chips, 10); assert.equal(card.casino.points, 16);
  const bought = gameReducer(card, { type: 'CASINO_PRIZE', prizeId: 'radio' });
  assert.equal(bought.casino.points, 1); assert.equal(casinoBadge(bought.casino).id, 'radio');
  assert.deepEqual(bought.casino.owned, ['radio']);
  const removed = gameReducer(bought, { type: 'CASINO_PRIZE', prizeId: 'radio' });
  assert.equal(casinoBadge(removed.casino), undefined); assert.equal(removed.casino.points, 1);
  assert.deepEqual(gameReducer(removed, { type: 'CASINO_PRIZE', prizeId: 'unknown' }).casino.owned, ['radio']);
});

test('casino modal renders safe and no real-money purchase controls', () => {
  const state = createInitialState();
  const value = { state, dispatch: () => {}, derived: {}, vkUser: null, isLoading: false, serverMode: false };
  const html = renderToStaticMarkup(React.createElement(GameContext.Provider, { value }, React.createElement(CasinoModal, { onClose: () => {} })));
  assert.match(html, /РЖАВЫЙ ДЖЕКПОТ/); assert.match(html, /СЕЙФ 1/); assert.match(html, /Реальные деньги/);
  assert.doesNotMatch(html, /КУПИТЬ ФИШКИ/);
});
