import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProgressAction } from '../dist/progressAction.js';
import { createInitialState, gameReducer } from '../dist/generated/game.js';

test('server allows only explicitly reviewed actions and rejects injected fields', () => {
  assert.deepEqual(parseProgressAction({ type: 'SET_APPEARANCE', appearance: 3 }), { type: 'SET_APPEARANCE', appearance: 3 });
  assert.deepEqual(parseProgressAction({ type: 'SKIP_TUTORIAL' }), { type: 'SKIP_TUTORIAL' });
  for (const action of [null, [], { type: 'ADD_RESOURCE', resource: 'gold', amount: 1000 },
    { type: 'HYDRATE_STATE', state: {} }, { type: 'CLAIM_LOGIN_REWARD' },
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
