import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const { createInitialState } = await vite.ssrLoadModule('/src/game/initialState.ts');
const { gameReducer } = await vite.ssrLoadModule('/src/game/reducer.ts');
const { makeTestTopUp, TOP_UP_DETAILS, TOP_UP_PACKS } = await vite.ssrLoadModule('/src/game/resourceTopUp.ts');
const { ResourceTopUp } = await vite.ssrLoadModule('/src/panels/ResourceTopUp.tsx');
const { GameContext } = await vite.ssrLoadModule('/src/game/GameContext.tsx');
const initial = createInitialState();
const render = (resource, serverMode, state = initial) => renderToStaticMarkup(React.createElement(GameContext.Provider,
  { value: { state, dispatch: () => {}, derived: {}, vkUser: null, isLoading: false, serverMode } },
  React.createElement(ResourceTopUp, { resource, onClose: () => {} })));

test('every top bar resource has its own modal, actual balance and safe server state', () => {
  for (const resource of Object.keys(TOP_UP_DETAILS)) {
    const html = render(resource, true);
    assert.ok(html.includes(TOP_UP_DETAILS[resource].title));
    assert.match(html, /role="dialog"/);
    assert.match(html, /Пополнение этого ресурса пока недоступно/);
    assert.doesNotMatch(html, /БЕСПЛАТНО · ТЕСТ/);
    assert.equal((html.match(/disabled=""/g) ?? []).length, 3);
  }
});

test('free test packs affect only the selected local resource and never premium or server state', () => {
  for (const resource of ['energy', 'matches', 'bullets', 'gold', 'zhetons']) {
    const action = makeTestTopUp(resource, 10, true, initial);
    assert.deepEqual(action, { type: 'ADD_RESOURCE', resource, amount: 10 });
    const result = gameReducer(initial, action);
    assert.equal(result[resource], initial[resource] + 10);
    assert.equal(result.premiumGold, initial.premiumGold);
    assert.equal(result.caps, initial.caps);
    assert.equal(makeTestTopUp(resource, 10, false, initial), null);
    assert.equal(makeTestTopUp(resource, 999, true, initial), null);
  }
  assert.equal(makeTestTopUp('premium', 10, true, initial), null);
  assert.equal(makeTestTopUp('premium', 10, false, initial), null);
  assert.deepEqual(TOP_UP_PACKS, [10, 50, 100]);
});

test('energy packages respect capacity, and full energy has disabled actions', () => {
  const almostFull = { ...initial, energy: 97 };
  assert.deepEqual(makeTestTopUp('energy', 50, true, almostFull), { type: 'ADD_RESOURCE', resource: 'energy', amount: 3 });
  const full = { ...initial, energy: initial.maxEnergy };
  assert.equal(makeTestTopUp('energy', 10, true, full), null);
  const html = render('energy', false, full);
  assert.match(html, /Энергия уже заполнена/);
  assert.equal((html.match(/disabled=""/g) ?? []).length, 3);
});

test('canvas handlers open modals instead of directly dispatching resource grants', async () => {
  const canvas = await readFile('src/components/FallenCanvas/FallenCanvas.tsx', 'utf8');
  for (const resource of Object.keys(TOP_UP_DETAILS)) assert.ok(canvas.includes(`setTopUpResource('${resource}')`));
  assert.doesNotMatch(canvas, /type: 'ADD_RESOURCE'/);
  assert.match(canvas, /<ResourceTopUp resource=\{topUpResource\}/);
});
