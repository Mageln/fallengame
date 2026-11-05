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

import { applyCombatAction, advanceCombat } from '../dist/progressCombat.js';

test('boss actions reject client-provided clock and enforce server attack interval', () => {
  assert.equal(parseProgressAction({ type: 'BOSS_SKILL', skillId: 'jab', now: 9999999999 }), null);
  assert.equal(parseProgressAction({ type: 'BOSS_TICK', now: 9999999999 }), null);
  const clock = Date.now;
  try {
    Date.now = () => 100000;
    const started = applyCombatAction(createInitialState(), parseProgressAction({ type: 'START_BOSS_FIGHT', bossId: '1' }), Date.now());
    assert.equal(started.battle.startedAt, 100000);
    const hit = applyCombatAction(started, parseProgressAction({ type: 'BOSS_SKILL', skillId: 'jab' }), 100100);
    assert.ok(hit.battle.bossHp < started.battle.bossHp);
    const tooFast = applyCombatAction(hit, parseProgressAction({ type: 'BOSS_SKILL', skillId: 'jab' }), 100200);
    assert.equal(tooFast.battle.bossHp, hit.battle.bossHp);
    const next = applyCombatAction(tooFast, parseProgressAction({ type: 'BOSS_SKILL', skillId: 'jab' }), 100350);
    assert.ok(next.battle.bossHp < hit.battle.bossHp);
    const expired = advanceCombat(next, started.battle.endsAt + 1);
    assert.notEqual(expired.battle.outcome, 'fighting');
  } finally { Date.now = clock; }
});

test('map raid uses server time, costs energy, and reward cannot be claimed twice', () => {
  const clock = Date.now;
  try {
    Date.now = () => 100000;
    const initial = { ...createInitialState(), energy: 100 };
    const raidId = initial.mapRaids[0].id;
    const command = (type) => parseProgressAction({ type, raidId });
    const started = applyCombatAction(initial, command('START_RAID'), Date.now());
    const raid = started.mapRaids.find((r) => r.id === raidId);
    assert.equal(raid.startTime, 100000);
    assert.equal(started.energy, 100 - raid.energyCost);
    assert.equal(applyCombatAction(started, command('CLAIM_RAID_REWARD'), Date.now()).matches, started.matches);
    Date.now = () => raid.endTime + 1;
    const claimed = applyCombatAction(started, command('CLAIM_RAID_REWARD'), Date.now());
    const repeated = applyCombatAction(claimed, command('CLAIM_RAID_REWARD'), Date.now());
    assert.equal(claimed.matches, started.matches + raid.rewards.matches);
    assert.equal(repeated.matches, claimed.matches);
    assert.equal(repeated.experience, claimed.experience);
    assert.equal(parseProgressAction({ type: 'COMPLETE_RAID_TASKS', raidId, mode: 'free' }), null);
    assert.equal(parseProgressAction({ type: 'START_RAID', raidId, rewards: { matches: 99999 } }), null);
  } finally { Date.now = clock; }
});

test('turn battle commands are validated and processed by the server', () => {
  assert.equal(parseProgressAction({ type: 'BATTLE_ATTACK', technique: 'false' }), null);
  assert.equal(parseProgressAction({ type: 'BATTLE_GRENADES', count: -5 }), null);
  assert.equal(parseProgressAction({ type: 'BATTLE_GRENADES', count: 2 }), null);
  assert.equal(parseProgressAction({ type: 'INVITE_FRIEND' }), null);
  const initial = createInitialState();
  const started = applyCombatAction(initial, parseProgressAction({ type: 'START_BOSS', districtId: initial.currentDistrict }), Date.now());
  assert.equal(started.battle.source, 'district');
  const next = applyCombatAction(started, parseProgressAction({ type: 'BATTLE_ATTACK', technique: false }), Date.now());
  assert.ok(next.battle.turn > started.battle.turn || next.battle.outcome !== 'fighting');
});
