import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProgressAction } from '../dist/progressAction.js';
import { createInitialState, gameReducer, applyDailyReset, TUTORIAL_STEPS } from '../dist/generated/game.js';

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
  assert.equal(parseProgressAction({ type: 'BOSS_POWER_ATTACK' }), null);
  assert.equal(parseProgressAction({ type: 'BOSS_SKILL', skillId: 'hook' }), null);
  for (const skillId of ['jab', 'weapon', 'block', 'heal']) {
    assert.deepEqual(parseProgressAction({ type: 'BOSS_SKILL', skillId }), { type: 'BOSS_SKILL', skillId });
  }
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
    assert.equal(expired.battle.outcome, 'fighting');
    assert.ok(expired.battle.playerHp >= 1);
    assert.deepEqual(parseProgressAction({ type: 'ABANDON_BOSS' }), { type: 'ABANDON_BOSS' });
    const abandoned = applyCombatAction(expired, parseProgressAction({ type: 'ABANDON_BOSS' }), started.battle.endsAt + 2);
    assert.equal(abandoned.battle, null);
    assert.equal(abandoned.woundedBosses['1'], expired.battle.bossHp);
  } finally { Date.now = clock; }
});

test('server boss abilities enforce energy costs and reject old combat bypasses', () => {
  const clock = Date.now;
  try {
    Date.now = () => 200000;
    let state = applyCombatAction(createInitialState(), parseProgressAction({ type: 'START_BOSS_FIGHT', bossId: '1' }), Date.now());
    state = { ...state, battle: { ...state.battle, bossHp: 10000, playerHp: 50 } };
    const command = (skillId) => parseProgressAction({ type: 'BOSS_SKILL', skillId });
    const noEnergy = applyCombatAction(state, command('weapon'), 200001);
    assert.equal(noEnergy.battle.bossHp, state.battle.bossHp);
    for (let i = 0; i < 4; i++) state = applyCombatAction(state, command('jab'), 200100 + i * 250);
    assert.equal(state.battle.bossEnergy, 80);
    const beforeHp = state.battle.bossHp;
    state = applyCombatAction(state, command('weapon'), 201100);
    assert.equal(state.battle.bossEnergy, 70);
    assert.ok(state.battle.bossHp < beforeHp);
    state = applyCombatAction(state, command('block'), 201350);
    assert.equal(state.battle.bossEnergy, 50);
    assert.equal(state.battle.blocking, true);
    state = applyCombatAction(state, command('heal'), 201600);
    assert.equal(state.battle.bossEnergy, 0);
    assert.ok(state.battle.playerHp > 50);
    const bypass = applyCombatAction(state, parseProgressAction({ type: 'BATTLE_POWER' }), 201850);
    assert.equal(bypass.battle.bossHp, state.battle.bossHp);
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

test('server validates skill ids and ignores client supplied prices and state', () => {
  for (const skillId of ['fist', 'weapon', 'block', 'heal']) {
    assert.deepEqual(parseProgressAction({ type: 'UPGRADE_PROFILE_SKILL', skillId }), { type: 'UPGRADE_PROFILE_SKILL', skillId });
  }
  for (const action of [
    { type: 'UPGRADE_PROFILE_SKILL', skillId: 'health' },
    { type: 'UPGRADE_PROFILE_SKILL', skillId: 'luck' },
    { type: 'UPGRADE_PROFILE_SKILL', skillId: 'not-a-skill' },
    { type: 'UPGRADE_PROFILE_SKILL', skillId: 'heal', cost: 0 },
    { type: 'UPGRADE_PROFILE_SKILL', skillId: 'heal', level: 10 },
    { type: 'UPGRADE_PROFILE_SKILL', skillId: 'heal', bullets: 999999 },
  ]) assert.equal(parseProgressAction(action), null);
});

test('server upgrades abilities with server-calculated prices, limits and battle restriction', () => {
  const command = (skillId) => parseProgressAction({ type: 'UPGRADE_PROFILE_SKILL', skillId });
  let state = { ...createInitialState(), bullets: 1000 };
  state = applyCombatAction(state, command('heal'), Date.now());
  assert.equal(state.bullets, 950);
  assert.equal(state.profileSkills.heal, 1);
  assert.equal(state.health, 100);
  assert.equal(state.maxHealth, 100);
  state = applyCombatAction(state, command('heal'), Date.now());
  assert.equal(state.bullets, 850);
  assert.equal(state.profileSkills.heal, 2);
  const persisted = JSON.parse(JSON.stringify(state));
  assert.deepEqual(persisted.profileSkills, state.profileSkills);
  assert.equal(persisted.bullets, 850);
  const poor = applyCombatAction({ ...state, bullets: 0 }, command('heal'), Date.now());
  assert.equal(poor.profileSkills.heal, 2);
  assert.equal(poor.bullets, 0);
  const maxed = { ...state, profileSkills: { ...state.profileSkills, heal: 10 } };
  assert.equal(applyCombatAction(maxed, command('heal'), Date.now()).bullets, 850);
  const battle = applyCombatAction(state, parseProgressAction({ type: 'START_BOSS_FIGHT', bossId: '1' }), Date.now());
  const blocked = applyCombatAction(battle, command('fist'), Date.now());
  assert.equal(blocked.profileSkills.fist, 0);
  assert.equal(blocked.bullets, battle.bullets);
  for (const skillId of ['fist', 'weapon', 'block']) {
    state = applyCombatAction(state, command(skillId), Date.now());
    assert.equal(state.profileSkills[skillId], 1);
  }
  assert.equal(state.bullets, 700);
});

test('old server skills normalize without losing purchased passive benefits or bullets', () => {
  const initial = createInitialState();
  const legacy = { ...initial, bullets: 123, health: 110, maxHealth: 120,
    profileSkills: { health: 2, fist: 3, luck: 4, block: 1 } };
  const loaded = advanceCombat(legacy, Date.now());
  assert.deepEqual(loaded.profileSkills, { fist: 3, weapon: 0, block: 1, heal: 0, health: 2, luck: 4 });
  assert.equal(loaded.bullets, 123);
  assert.equal(loaded.maxHealth, 120);
  assert.deepEqual(advanceCombat(loaded, Date.now()).profileSkills, loaded.profileSkills);
  const upgraded = applyCombatAction(legacy, parseProgressAction({ type: 'UPGRADE_PROFILE_SKILL', skillId: 'weapon' }), Date.now());
  assert.equal(upgraded.profileSkills.weapon, 1);
  assert.equal(upgraded.profileSkills.health, 2);
  assert.equal(upgraded.bullets, 73);
});

test('server weapon and heal levels change the corresponding boss ability', () => {
  const started = applyCombatAction(createInitialState(), parseProgressAction({ type: 'START_BOSS_FIGHT', bossId: '2' }), Date.now());
  const prepared = { ...started, battle: { ...started.battle, bossHp: 10000, bossEnergy: 100, playerHp: 30 } };
  const trained = { ...prepared, profileSkills: { ...prepared.profileSkills, weapon: 5, heal: 5 } };
  const weapon = parseProgressAction({ type: 'BOSS_SKILL', skillId: 'weapon' });
  const heal = parseProgressAction({ type: 'BOSS_SKILL', skillId: 'heal' });
  const now = started.battle.startedAt + 1;
  assert.ok(applyCombatAction(trained, weapon, now).battle.lastHit.damage > applyCombatAction(prepared, weapon, now).battle.lastHit.damage);
  assert.equal(applyCombatAction(trained, heal, now).battle.playerHp - applyCombatAction(prepared, heal, now).battle.playerHp, 25);
});

test('server combat applies fist, luck and block skill effects', () => {
  const random = Math.random;
  try {
    Math.random = () => 0.5;
    const start = applyCombatAction(createInitialState(), parseProgressAction({ type: 'START_BOSS_FIGHT', bossId: '2' }), Date.now());
    const command = parseProgressAction({ type: 'BOSS_SKILL', skillId: 'jab' });
    const now = start.battle.startedAt + 1;
    const normal = applyCombatAction(start, command, now);
    const fist = applyCombatAction({ ...start, profileSkills: { ...start.profileSkills, fist: 10 } }, command, now);
    assert.ok(fist.battle.lastHit.damage > normal.battle.lastHit.damage);
    Math.random = () => 0;
    const lucky = applyCombatAction({ ...start, profileSkills: { ...start.profileSkills, luck: 1 } }, command, now);
    assert.equal(lucky.battle.lastHit.crit, true);
    const defending = { ...start, battle: { ...start.battle, blocking: true } };
    const hitAt = start.battle.startedAt + 8000;
    const plainBlock = advanceCombat(defending, hitAt);
    const strongBlock = advanceCombat({ ...defending, profileSkills: { ...defending.profileSkills, block: 10 } }, hitAt);
    assert.ok(strongBlock.battle.playerHp > plainBlock.battle.playerHp);
  } finally { Math.random = random; }
});

test('server purchases and equips the cap without duplicating or replacing balance', () => {
  let state = { ...createInitialState(), gold: 1000 };
  const buy = (itemId) => parseProgressAction({ type: 'BUY_SHOP_ITEM', category: 'clothing', currency: 'gold', itemId });
  const equip = (slotIndex) => parseProgressAction({ type: 'EQUIP_ITEM', slotIndex });
  state = applyCombatAction(state, buy('shop_helmet'), Date.now());
  state = applyCombatAction(state, equip(0), Date.now());
  state = applyCombatAction(state, buy('shop_cap'), Date.now());
  assert.equal(state.gold, 170);
  assert.deepEqual(state.equipmentIds, ['shop_cap']);
  assert.equal(state.inventory[0].equipped, false);
  assert.equal(state.inventory[1].equipped, true);
  assert.equal(applyCombatAction(state, buy('shop_cap'), Date.now()).gold, 170);
});

test('server arena validates commands and grants a win only once', () => {
  assert.equal(parseProgressAction({ type: 'START_ARENA', opponentId: 'raider', gold: 999 }), null);
  assert.equal(parseProgressAction({ type: 'ARENA_SKILL', skillId: 'jab', now: 1 }), null);
  assert.equal(parseProgressAction({ type: 'ARENA_SKILL', skillId: 'unknown' }), null);
  const act = (state, action) => applyCombatAction(state, parseProgressAction(action), Date.now());
  let state = act(createInitialState(), { type: 'START_ARENA', opponentId: 'raider' });
  assert.equal(state.arena.used, 1);
  let turns = 0;
  while (state.arena.battle.outcome === 'fighting' && turns++ < 40) {
    state = act(state, { type: 'ARENA_SKILL', skillId: state.arena.battle.energy >= 10 ? 'weapon' : 'jab' });
  }
  assert.equal(state.arena.battle.outcome, 'won');
  assert.equal(state.gold, 20);
  assert.equal(state.bullets, 25);
  const again = act(state, { type: 'ARENA_SKILL', skillId: 'jab' });
  assert.equal(again.gold, 20);
  assert.equal(again.bullets, 25);
  state = act(state, { type: 'CLOSE_ARENA_BATTLE' });
  state = act(state, { type: 'START_ARENA', opponentId: 'bogus' });
  assert.equal(state.arena.used, 1);
});

test('server allows boss fights without health or medkits and keeps arena attempt limit', () => {
  const initial = { ...createInitialState(), health: 0, medkits: 0 };
  const startBoss = parseProgressAction({ type: 'START_BOSS_FIGHT', bossId: '1' });
  let state = applyCombatAction(initial, startBoss, Date.now());
  assert.equal(state.battle.playerHp, state.battle.playerMaxHp);
  state = advanceCombat(state, state.battle.startedAt + 86_400_000);
  assert.equal(state.battle.outcome, 'fighting');
  assert.equal(state.battle.playerHp, 1);
  assert.equal(state.health, 0);
  state = applyCombatAction(state, parseProgressAction({ type: 'ABANDON_BOSS' }), Date.now());
  for (let i = 0; i < 5; i++) {
    state = applyCombatAction(state, parseProgressAction({ type: 'START_ARENA', opponentId: 'raider' }), Date.now());
    assert.equal(state.arena.used, i + 1);
    state = applyCombatAction(state, parseProgressAction({ type: 'CLOSE_ARENA_BATTLE' }), Date.now());
  }
  state = applyCombatAction(state, parseProgressAction({ type: 'START_ARENA', opponentId: 'raider' }), Date.now());
  assert.equal(state.arena.used, 5);
  assert.equal(state.arena.battle, null);
});

test('server executes zombie attacks and preserves the brute attack sequence after reload', () => {
  for (const id of ['zombie', 'zombie_brute']) {
    const action = parseProgressAction({ type: 'START_BOSS_FIGHT', bossId: id });
    assert.ok(action);
    let state = applyCombatAction(createInitialState(), action, Date.now());
    state = { ...state, battle: { ...state.battle, playerHp: 1000, playerMaxHp: 1000 } };
    const start = state.battle.startedAt;
    state = advanceCombat(state, start + 16_000);
    state = JSON.parse(JSON.stringify(state));
    state = advanceCombat(state, start + 24_000);
    assert.equal(state.battle.playerHp, id === 'zombie' ? 976 : 944);
    assert.match(state.battle.log.at(-1), id === 'zombie' ? /Обычная атака/ : /Сильная атака/);
    assert.equal(state.battle.outcome, 'fighting');
  }
});

test('tutorial practice is server-owned, validated and cannot be restarted after completion', () => {
  let state = createInitialState();
  const act = (action) => { const parsed = parseProgressAction(action); assert.ok(parsed); state = applyCombatAction(state, parsed, Date.now()); };
  assert.equal(parseProgressAction({ type: 'TUTORIAL_PRACTICE', stepId: 'wrong' }), null);
  act({ type: 'TUTORIAL_PRACTICE', stepId: 'profile' });
  assert.equal(state.tutorialStep, 0);
  act({ type: 'NEXT_TUTORIAL' });
  assert.equal(state.tutorialStep, 0);
  act({ type: 'TUTORIAL_PRACTICE', stepId: 'intro' });
  assert.equal(state.tutorialStep, 1);
  act({ type: 'TUTORIAL_PRACTICE', stepId: 'intro' });
  assert.equal(state.tutorialStep, 1);
  act({ type: 'SKIP_TUTORIAL' });
  assert.equal(state.tutorialStep, -1);
  act({ type: 'START_TUTORIAL' });
  assert.equal(state.tutorialStep, -1);
  assert.equal(parseProgressAction({ type: 'TUTORIAL_PRACTICE', stepId: 'intro', tutorialStep: 5 }), null);
});


test('server completes every practice step without granting or spending resources', () => {
  let state = createInitialState();
  const before = { bullets: state.bullets, gold: state.gold, matches: state.matches, energy: state.energy };
  for (const step of TUTORIAL_STEPS) {
    const action = parseProgressAction({ type: 'TUTORIAL_PRACTICE', stepId: step.id });
    assert.ok(action, step.id);
    state = applyCombatAction(state, action, Date.now());
  }
  assert.equal(state.tutorialStep, -1);
  assert.deepEqual({ bullets: state.bullets, gold: state.gold, matches: state.matches, energy: state.energy }, before);
  state = applyCombatAction(state, parseProgressAction({ type: 'START_TUTORIAL' }), Date.now());
  assert.equal(state.tutorialStep, -1);
});

test('casino commands cannot supply results, rewards, dates, stakes, or unknown prizes', () => {
  assert.deepEqual(parseProgressAction({ type: 'CASINO_SLOTS' }), { type: 'CASINO_SLOTS' });
  assert.deepEqual(parseProgressAction({ type: 'CASINO_SAFE', choice: 1 }), { type: 'CASINO_SAFE', choice: 1 });
  assert.deepEqual(parseProgressAction({ type: 'CASINO_CARD', choice: 2 }), { type: 'CASINO_CARD', choice: 2 });
  assert.deepEqual(parseProgressAction({ type: 'CASINO_PRIZE', prizeId: 'radio' }), { type: 'CASINO_PRIZE', prizeId: 'radio' });
  for (const action of [
    { type: 'CASINO_SLOTS', winnings: 999 }, { type: 'CASINO_SLOTS', bet: 0 },
    { type: 'CASINO_SAFE', choice: 1, date: '2030-01-01' }, { type: 'CASINO_SAFE', choice: 3 },
    { type: 'CASINO_CARD', choice: -1 }, { type: 'CASINO_CARD', choice: 0, outcome: 2 },
    { type: 'CASINO_PRIZE', prizeId: 'premium' },
  ]) assert.equal(parseProgressAction(action), null);
});

test('authoritative casino safe and spins only change reviewed game currencies', () => {
  const before = createInitialState();
  const safeAction = parseProgressAction({ type: 'CASINO_SAFE', choice: 0 });
  const first = gameReducer(before, safeAction);
  assert.equal(first.casino.chips, 10);
  const duplicate = gameReducer(first, parseProgressAction({ type: 'CASINO_SAFE', choice: 1 }));
  assert.equal(duplicate.casino.chips, 10);
  assert.equal(duplicate.bullets, first.bullets);
  assert.equal(duplicate.matches, first.matches);
  assert.equal(duplicate.gold, first.gold);
  const spin = gameReducer(duplicate, parseProgressAction({ type: 'CASINO_SLOTS' }));
  assert.equal(spin.casino.points, 1);
  assert.equal(spin.premiumGold, before.premiumGold);
  assert.equal(spin.caps, before.caps);
  assert.equal(spin.zhetons, before.zhetons);
  assert.equal(spin.gold, duplicate.gold);
});
