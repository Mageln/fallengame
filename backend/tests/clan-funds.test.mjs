import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debitClanCreation } from '../dist/clanFunds.js';

test('clan creation charges only the authoritative server balance', () => {
  const state = { gold: 2600, premiumGold: 15, inventory: [] };
  const result = debitClanCreation(state);
  assert.equal(result.gold, 100);
  assert.equal(result.premiumGold, 15);
  assert.equal(state.gold, 2600);
  for (const input of [null, {}, [], { gold: 2499 }, { gold: '9999' }, { gold: -1 }, { gold: Infinity }, { gold: 2500.5 }]) {
    assert.equal(debitClanCreation(input), null);
  }
  assert.equal(debitClanCreation({ gold: 2500 }).gold, 0);
});
