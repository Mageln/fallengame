import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProgressAction } from '../dist/progressAction.js';
import { createInitialState, gameReducer, applyDailyReset } from '../dist/generated/game.js';

test('server allows only explicitly reviewed actions and rejects injected fields', () => {
  assert.deepEqual(parseProgressAction({ type: 'SET_APPEARANCE', appearance: 3 }), { type: 'SET_APPEARANCE', appearance: 3 });
  assert.deepEqual(parseProgressAction({ type: 'SKIP_TUTORIAL' }), { type: 'SKIP_TUTORIAL' });
  for (const action of [null, [], { type: 'ADD_RESOURCE', resource: 'gold', amount: 1000 },
    { type: 'HYDRATE_STATE', state: {} }, { type: 'RESTORE_ENERGY_TICK' },
    { type: 'SET_APPEARANCE', appearance: 6 }, { type: 'SET_APPEARANCE', appearance: 1, state: {} }]) {
    assert.equal(parseProgressAction(action), null);
  }
});

test('server starts with the game defaults and applies reviewed actions', () => {
  const initial = createInitialState();
  assert.equal(initial.gold, 0);
  assert.equal(initial.premiumGold, 0);
  const updated = gameReducer(initial, parseProgressAction({ type: 'SET_APPEARANCE', appearance: 2 }));
  assert.equal(updated.appearance, 2);
  assert.equal(updated.gold, initial.gold);
});

import { restoreEnergy } from '../dist/progressEnergy.js';

test('energy is based on server elapsed time, capped and cannot be banked', () => {
  const state = { energy: 2, maxEnergy: 5, shelterGenerator: false };
  const a = restoreEnergy(state, new Date(10000), new Date(22000));
  assert.equal(a.state.energy, 4);
  assert.equal(a.anchor.getTime(), 20000);
  const capped = restoreEnergy(a.state, a.anchor, new Date(100000));
  assert.equal(capped.state.energy, 5);
  assert.equal(capped.anchor.getTime(), 100000);
  const spent = restoreEnergy({ ...capped.state, energy: 1 }, capped.anchor, new Date(100001));
  assert.equal(spent.state.energy, 1);
  assert.equal(restoreEnergy({ energy: 0, maxEnergy: 5, shelterGenerator: true }, new Date(0), new Date(5000)).state.energy, 2);
});

test('reward actions are validated and daily reward cannot be claimed twice', () => {
  assert.equal(parseProgressAction({ type: 'DO_TASK', taskId: 'x', cost: 0 }), null);
  assert.deepEqual(parseProgressAction({ type: 'DO_TASK', taskId: 'x' }), { type: 'DO_TASK', taskId: 'x' });
  assert.equal(parseProgressAction({ type: 'BUY_SHOP_ITEM', category: 'weapon', currency: 'gold', itemId: 'x', price: 0 }), null);
  const initial = applyDailyReset(createInitialState());
  const action = parseProgressAction({ type: 'CLAIM_LOGIN_REWARD' });
  const first = gameReducer(initial, action);
  const second = gameReducer(first, action);
  assert.equal(second.bullets, first.bullets);
  assert.equal(second.gold, first.gold);
});
