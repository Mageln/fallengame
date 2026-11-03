import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());

const { createInitialState } = await vite.ssrLoadModule('/src/game/initialState.ts');
const { gameReducer, hydrateState } = await vite.ssrLoadModule('/src/game/reducer.ts');
const { roomDropChance, BOSS_COUNTER_MS, BOSS_DURATION_MS, bossAttackPrice, todayLocal, BOSS_ATTACK_CONFIG } = await vite.ssrLoadModule('/src/game/survival.ts');

const act = (state, type, details = {}) => gameReducer(state, { type, ...details });

test('room chance rises with damage and never exceeds 50%', () => {
  assert.equal(roomDropChance(0), 0.05);
  assert.equal(roomDropChance(100), 0.1);
  assert.equal(roomDropChance(900), 0.5);
  assert.equal(roomDropChance(1e9), 0.5);
  assert.equal(roomDropChance(-100), 0.05);
  assert.equal(roomDropChance(NaN), 0.05);
});

test('a boss victory rolls a room; only an available drop can be claimed', () => {
  const initial = createInitialState();
  assert.deepEqual(initial.unlockedRooms, ['location1']);
  assert.equal(act(initial, 'CHANGE_LOCATION', { locationId: 'location2' }).currentLocation, 'location1');
  let state = act(initial, 'START_BOSS_FIGHT', { bossId: '1' });
  assert.equal(state.bossAttacks.entries['1'], undefined);
  state = { ...state, battle: { ...state.battle, bossHp: 1, damageDealt: 900 } };
  const random = Math.random;
  try {
    Math.random = () => 0;
    state = act(state, 'BOSS_SKILL', { skillId: 'jab', now: state.battle.startedAt + 1 });
  } finally {
    Math.random = random;
  }
  assert.equal(state.battle.outcome, 'won');
  assert.equal(state.battle.reward.roomChance, 0.5);
  assert.equal(state.battle.reward.dropped, true);
  assert.equal(state.pendingRoomDrop.roomId, 'location2');
  assert.deepEqual(state.unlockedRooms, ['location1']);
  const claimed = act(state, 'CLAIM_ROOM');
  assert.ok(claimed.unlockedRooms.includes('location2'));
  assert.equal(act(claimed, 'CLAIM_ROOM'), claimed);
  assert.equal(act(claimed, 'CHANGE_LOCATION', { locationId: 'location2' }).currentLocation, 'location2');
  const questBefore = claimed.daily.quests.find((quest) => quest.questId === 'q1').progress;
  const awarded = act(claimed, 'LEAVE_BATTLE');
  assert.equal(awarded.battle, null);
  assert.equal(awarded.daily.quests.find((quest) => quest.questId === 'q1').progress, questBefore + 1);
  assert.equal(awarded.bullets, claimed.battle.reward.bullets);
  assert.equal(act(awarded, 'LEAVE_BATTLE'), awarded);
});

test('an unsuccessful roll leaves the room locked', () => {
  let state = act(createInitialState(), 'START_BOSS_FIGHT', { bossId: '1' });
  state = { ...state, battle: { ...state.battle, bossHp: 1 } };
  const random = Math.random;
  try {
    Math.random = () => 0.99;
    state = act(state, 'BOSS_SKILL', { skillId: 'jab', now: state.battle.startedAt + 1 });
  } finally {
    Math.random = random;
  }
  assert.equal(state.battle.outcome, 'won');
  assert.equal(state.lastRoomRoll.dropped, false);
  assert.equal(state.pendingRoomDrop, null);
  assert.equal(act(state, 'CLAIM_ROOM'), state);
});

test('leaving a boss battle does not pause the boss; returning resumes it', () => {
  let state = act(createInitialState(), 'START_BOSS_FIGHT', { bossId: '2' });
  const start = state.battle.startedAt;
  state = act(state, 'LEAVE_BATTLE');
  assert.equal(state.battleVisible, false);
  assert.equal(state.battle.outcome, 'fighting');
  state = act(state, 'BOSS_TICK', { now: start + 2 * BOSS_COUNTER_MS });
  assert.ok(state.battle.playerHp < state.battle.playerMaxHp);
  assert.equal(state.battle.lastCounterAt, start + 2 * BOSS_COUNTER_MS);
  state = act(state, 'OPEN_BATTLE');
  assert.equal(state.battleVisible, true);
  assert.equal(state.battle.bossMaxHp, 250);
  state = act(state, 'BOSS_TICK', { now: start + BOSS_DURATION_MS + 1 });
  assert.equal(state.battle.outcome, 'lost');
  const hp = state.battle.bossHp;
  state = act(state, 'LEAVE_BATTLE');
  assert.equal(state.woundedBosses['2'], hp);
  assert.equal(state.battle, null);
});

test('timed boss attacks reset after two hours and extra attacks cost caps', () => {
  BOSS_ATTACK_CONFIG.timedLimits = true;
  try {
  const initial = createInitialState();
  const price = bossAttackPrice(5);
  let state = {
    ...initial,
    caps: price + 5,
    premiumGold: 10,
    bossAttacks: { date: todayLocal(), entries: { '1': { used: 5, purchased: 0 } } },
  };
  assert.equal(act(state, 'START_BOSS_FIGHT', { bossId: '1' }).battle, null);
  state = act(state, 'BUY_BOSS_ATTACK', { bossId: '1' });
  assert.equal(state.caps, 5);
  assert.equal(state.premiumGold, 10);
  assert.equal(state.bossAttacks.entries['1'].purchased, 1);
  assert.equal(act(state, 'BUY_BOSS_ATTACK', { bossId: '1' }).caps, 5);
  state = act(state, 'START_BOSS_FIGHT', { bossId: '1' });
  assert.equal(state.bossAttacks.entries['1'].used, 6);
  assert.equal(state.battle.source, 'boss');
  assert.equal(act(state, 'BATTLE_GRENADES', { count: 1 }), state);
  const reset = act({ ...state, battle: null }, 'BOSS_TICK', { now: state.bossAttacks.resetAt });
  assert.deepEqual(reset.bossAttacks.entries, {});
  assert.equal(reset.caps, 5);
  assert.equal(reset.premiumGold, 10);
  } finally { BOSS_ATTACK_CONFIG.timedLimits = false; }
});

test('raid awards matches, tasks award tokens and health, never donation gold', () => {
  let state = { ...createInitialState(), energy: 100, health: 40, premiumGold: 30 };
  state = act(state, 'START_RAID', { raidId: 'raid_1' });
  state = act(state, 'OPEN_RAID_TASKS', { raidId: 'raid_1' });
  state = act(state, 'COMPLETE_RAID_TASKS', { raidId: 'raid_1', mode: 'energy' });
  assert.equal(state.zhetons, 9);
  assert.equal(state.health, 75);
  assert.equal(state.premiumGold, 30);
  assert.equal(state.raidTasks.completedIds.length, 3);
  assert.equal(act(state, 'COMPLETE_RAID_TASKS', { raidId: 'raid_1', mode: 'gold' }).premiumGold, 30);
  state = act(state, 'CLOSE_RAID_TASKS');
  state = act(state, 'START_RAID', { raidId: 'raid_2' });
  state = act(state, 'OPEN_RAID_TASKS', { raidId: 'raid_2' });
  assert.equal(state.raidTasks.completedIds.length, 0);
  state = act(state, 'COMPLETE_RAID_TASKS', { raidId: 'raid_2', mode: 'gold' });
  assert.equal(state.premiumGold, 0);
  assert.equal(state.zhetons, 18);
  state = act(state, 'START_RAID', { raidId: 'raid_1' });
  state = act(state, 'OPEN_RAID_TASKS', { raidId: 'raid_1' });
  assert.equal(state.raidTasks.completedIds.length, 3);
  const before = state.premiumGold;
  const startedAt = state.mapRaids.find((raid) => raid.id === 'raid_1').endTime;
  const realNow = Date.now;
  try {
    Date.now = () => startedAt + 1;
    state = act(state, 'CLAIM_RAID_REWARD', { raidId: 'raid_1' });
  } finally {
    Date.now = realNow;
  }
  assert.equal(state.premiumGold, before);
  assert.equal(state.matches, 12);
});

test('solo tasks produce tokens, while routine earnings never produce premium gold', () => {
  let state = { ...createInitialState(), energy: 100 };
  state = act(state, 'DO_TASK', { taskId: 'sg1' });
  assert.equal(state.premiumGold, 0);
  assert.equal(state.bullets, 0);
  assert.equal(state.matches, 0);
  state = act(state, 'CLAIM_DAILY');
  assert.equal(state.premiumGold, 0);
});

test('old saves preserve their current room and get safe new defaults', () => {
  const previous = createInitialState();
  previous.currentLocation = 'location4';
  delete previous.unlockedRooms;
  delete previous.premiumGold;
  delete previous.bossAttacks;
  delete previous.raidTaskProgress;
  const loaded = hydrateState(previous);
  assert.ok(loaded.unlockedRooms.includes('location1'));
  assert.ok(loaded.unlockedRooms.includes('location4'));
  assert.equal(loaded.premiumGold, 0);
  assert.deepEqual(loaded.raidTaskProgress, {});
  assert.equal(act(loaded, 'CHANGE_LOCATION', { locationId: 'location4' }).currentLocation, 'location4');
});

test('boss energy charges on successful hits and powers a strong attack', () => {
  let state = act(createInitialState(), 'START_BOSS_FIGHT', { bossId: '1' });
  state = { ...state, battle: { ...state.battle, bossHp: 10000, bossMaxHp: 10000 } };
  const now = state.battle.startedAt + 1;
  assert.equal(state.battle.bossEnergy, 0);
  const tooEarly = act(state, 'BOSS_POWER_ATTACK', { now });
  assert.equal(tooEarly.battle.bossHp, state.battle.bossHp);
  for (let i = 0; i < 6; i++) state = act(state, 'BOSS_SKILL', { skillId: 'jab', now: now + i });
  assert.equal(state.battle.bossEnergy, 100);
  const hp = state.battle.bossHp;
  const total = state.battle.damageDealt;
  state = act(state, 'BOSS_POWER_ATTACK', { now: now + 10 });
  assert.equal(state.battle.bossEnergy, 0);
  assert.ok(hp - state.battle.bossHp > 8);
  assert.equal(state.battle.damageDealt - total, hp - state.battle.bossHp);
  assert.equal(act(state, 'BOSS_POWER_ATTACK', { now: now + 11 }).battle.bossHp, state.battle.bossHp);
});

test('test mode allows attacking an exhausted boss without consuming or buying attacks', () => {
  let state = { ...createInitialState(), caps: 100, bossAttacks: { date: todayLocal(), entries: { '1': { used: 999, purchased: 1 } } } };
  const before = state.bossAttacks;
  const bought = act(state, 'BUY_BOSS_ATTACK', { bossId: '1' });
  assert.equal(bought.caps, 100);
  assert.equal(bought.bossAttacks, before);
  state = act(bought, 'START_BOSS_FIGHT', { bossId: '1' });
  assert.equal(state.battle.source, 'boss');
  assert.equal(state.bossAttacks, before);
});

test('boss battles report health and weapon restrictions without consuming attacks', () => {
  const initial = createInitialState();
  const injured = { ...initial, health: 0 };
  const noHealth = act(injured, 'START_BOSS_FIGHT', { bossId: '1' });
  assert.equal(noHealth.battle, null);
  assert.match(noHealth.lastMessage, /восстановите HP/i);
  assert.deepEqual(noHealth.bossAttacks, injured.bossAttacks);

  const broken = { ...initial, weapon: { ...initial.weapon, broken: true } };
  const noWeapon = act(broken, 'START_BOSS_FIGHT', { bossId: '1' });
  assert.equal(noWeapon.battle, null);
  assert.match(noWeapon.lastMessage, /Оружие сломано/i);
  assert.deepEqual(noWeapon.bossAttacks, broken.bossAttacks);
});

test('finished hidden boss battle can be reopened and closed before another attack', () => {
  let state = act(createInitialState(), 'START_BOSS_FIGHT', { bossId: '1' });
  state = act(state, 'LEAVE_BATTLE');
  state = act(state, 'BOSS_TICK', { now: state.battle.endsAt + 1 });
  assert.equal(state.battle.outcome, 'lost');
  assert.equal(state.battleVisible, false);
  state = act(state, 'OPEN_BATTLE');
  assert.equal(state.battleVisible, true);
  state = act(state, 'LEAVE_BATTLE');
  assert.equal(state.battle, null);
});

test('experience from boss victory is awarded exactly once on claiming', () => {
  let state = act(createInitialState(), 'START_BOSS_FIGHT', { bossId: '1' });
  state = { ...state, battle: { ...state.battle, bossHp: 1 } };
  state = act(state, 'BOSS_SKILL', { skillId: 'jab', now: state.battle.startedAt + 1 });
  assert.equal(state.experience, 0);
  assert.equal(state.battle.reward.experience, 110);
  state = act(state, 'LEAVE_BATTLE');
  assert.equal(state.experience, 110);
  assert.equal(act(state, 'LEAVE_BATTLE').experience, 110);
});

test('completed map raids grant less experience and cannot be claimed twice', () => {
  const initial = createInitialState();
  const raid = initial.mapRaids[0];
  let state = { ...initial, mapRaids: [{ ...raid, isRunning: true, endTime: Date.now() - 1 }] };
  state = act(state, 'CLAIM_RAID_REWARD', { raidId: raid.id });
  assert.equal(state.experience, 20);
  assert.equal(act(state, 'CLAIM_RAID_REWARD', { raidId: raid.id }).experience, 20);
  const red = { ...raid, type: 'red', isRunning: true, endTime: Date.now() - 1 };
  state = act({ ...initial, mapRaids: [red] }, 'CLAIM_RAID_REWARD', { raidId: red.id });
  assert.equal(state.experience, 40);
});

test('raid loot awards experience once and older saves start with zero', () => {
  const old = createInitialState();
  delete old.experience;
  assert.equal(hydrateState(old).experience, 0);
  let state = { ...createInitialState(), raid: { raidId: 'house', scouted: true, pathClear: true, cratesLooted: false } };
  state = act(state, 'RAID_LOOT');
  assert.equal(state.experience, 20);
  assert.equal(act(state, 'RAID_LOOT').experience, 20);
});

test('profile skills migrate, charge bullets and respect limits and active battles', () => {
  const old = createInitialState();
  delete old.profileSkills;
  assert.deepEqual(hydrateState(old).profileSkills, { health: 0, fist: 0, luck: 0, block: 0 });
  let state = { ...createInitialState(), bullets: 500 };
  state = act(state, 'UPGRADE_PROFILE_SKILL', { skillId: 'health' });
  assert.equal(state.bullets, 450);
  assert.equal(state.health, 110);
  assert.equal(state.maxHealth, 110);
  assert.equal(state.profileSkills.health, 1);
  assert.equal(hydrateState(state).maxHealth, 110);
  const started = act(state, 'START_BOSS_FIGHT', { bossId: '1' });
  assert.equal(started.battle.playerHp, 110);
  assert.equal(act(started, 'UPGRADE_PROFILE_SKILL', { skillId: 'health' }).bullets, 450);
  const poor = act({ ...state, bullets: 0 }, 'UPGRADE_PROFILE_SKILL', { skillId: 'health' });
  assert.equal(poor.profileSkills.health, 1);
  const maxed = act({ ...state, profileSkills: { ...state.profileSkills, health: 10 } }, 'UPGRADE_PROFILE_SKILL', { skillId: 'health' });
  assert.equal(maxed.bullets, 450);
  assert.equal(act(state, 'UPGRADE_PROFILE_SKILL', { skillId: 'invalid' }), state);
});

test('fist skill increases unarmed boss damage and luck can cause critical hits', () => {
  const initial = createInitialState();
  const started = act(initial, 'START_BOSS_FIGHT', { bossId: '2' });
  const now = started.battle.startedAt + 1;
  const base = act(started, 'BOSS_SKILL', { skillId: 'jab', now });
  const strong = act({ ...started, profileSkills: { ...started.profileSkills, fist: 10 } }, 'BOSS_SKILL', { skillId: 'jab', now });
  assert.ok(strong.battle.lastHit.damage > base.battle.lastHit.damage);
  const random = Math.random;
  try {
    Math.random = () => 0;
    const lucky = act({ ...started, profileSkills: { ...started.profileSkills, luck: 1 } }, 'BOSS_SKILL', { skillId: 'jab', now });
    assert.equal(lucky.battle.lastHit.crit, true);
    assert.ok(lucky.battle.lastHit.damage > base.battle.lastHit.damage);
  } finally { Math.random = random; }
});

test('block skill improves active block only in both combat systems', async () => {
  const { resolveIncoming, totalLuck } = await vite.ssrLoadModule('/src/game/formulas.ts');
  const initial = createInitialState();
  const trained = { ...initial, profileSkills: { ...initial.profileSkills, block: 10, luck: 1 } };
  assert.equal(totalLuck(trained), totalLuck(initial) + 20);
  assert.ok(resolveIncoming(trained, 100, { blocking: true }).damage < resolveIncoming(initial, 100, { blocking: true }).damage);
  assert.equal(resolveIncoming(trained, 100).damage, resolveIncoming(initial, 100).damage);
  const started = act(initial, 'START_BOSS_FIGHT', { bossId: '2' });
  const blocking = { ...started, battle: { ...started.battle, blocking: true } };
  const now = started.battle.startedAt + BOSS_COUNTER_MS;
  const base = act(blocking, 'BOSS_TICK', { now });
  const better = act({ ...blocking, profileSkills: trained.profileSkills }, 'BOSS_TICK', { now });
  assert.ok(better.battle.playerHp > base.battle.playerHp);
});

test('shop purchases charge chosen currency once, preserve weapons on swap and migrate old saves', () => {
  const old = createInitialState(); delete old.storedWeapons;
  assert.deepEqual(hydrateState(old).storedWeapons, []);
  let state = { ...createInitialState(), gold: 1000, premiumGold: 100 };
  const denied = act({ ...state, gold: 0 }, 'BUY_SHOP_ITEM', { category: 'weapon', itemId: 'shop_bat', currency: 'gold' });
  assert.equal(denied.storedWeapons.length, 0);
  state = act(state, 'BUY_SHOP_ITEM', { category: 'weapon', itemId: 'shop_bat', currency: 'gold' });
  assert.equal(state.gold, 500);
  assert.equal(state.storedWeapons[0].id, 'shop_bat');
  const duplicate = act(state, 'BUY_SHOP_ITEM', { category: 'weapon', itemId: 'shop_bat', currency: 'premium' });
  assert.equal(duplicate.premiumGold, 100);
  state = act(state, 'EQUIP_SHOP_WEAPON', { weaponId: 'shop_bat' });
  assert.equal(state.weapon.id, 'shop_bat');
  state = { ...state, weapon: { ...state.weapon, durability: 37, level: 2 } };
  state = act(state, 'EQUIP_SHOP_WEAPON', { weaponId: 'rusty_pistol' });
  state = act(hydrateState(state), 'EQUIP_SHOP_WEAPON', { weaponId: 'shop_bat' });
  assert.equal(state.weapon.durability, 37);
  assert.equal(state.weapon.level, 2);
  const battle = act(state, 'START_BOSS_FIGHT', { bossId: '2' });
  assert.equal(act(battle, 'EQUIP_SHOP_WEAPON', { weaponId: 'rusty_pistol' }).weapon.id, 'shop_bat');
  assert.equal(act(state, 'BUY_SHOP_ITEM', { category: 'weapon', itemId: 'shop_rifle', currency: 'other' }), state);
});

test('clothes are purchasable with premium, equip bonuses and replace same slot', async () => {
  const { totalStamina } = await vite.ssrLoadModule('/src/game/formulas.ts');
  let state = { ...createInitialState(), gold: 1000, premiumGold: 100 };
  state = act(state, 'BUY_SHOP_ITEM', { category: 'clothing', itemId: 'shop_cap', currency: 'premium' });
  assert.equal(state.premiumGold, 85);
  state = act(state, 'EQUIP_ITEM', { slotIndex: 0 });
  assert.equal(totalStamina(state), totalStamina(createInitialState()) + 8);
  state = act(state, 'BUY_SHOP_ITEM', { category: 'clothing', itemId: 'shop_helmet', currency: 'gold' });
  state = act(state, 'EQUIP_ITEM', { slotIndex: 1 });
  assert.deepEqual(state.equipmentIds, ['shop_helmet']);
  assert.equal(state.inventory[0].equipped, false);
  assert.equal(totalStamina(state), totalStamina(createInitialState()) + 20);
  const full = { ...state, inventory: Array.from({ length: 20 }, () => ({ itemId: 'scrap_metal', equipped: false })) };
  assert.equal(act(full, 'BUY_SHOP_ITEM', { category: 'clothing', itemId: 'shop_jacket', currency: 'gold' }).gold, full.gold);
});

test('shop weapons improve boss arena damage', () => {
  let state = { ...createInitialState(), gold: 500 };
  state = act(state, 'BUY_SHOP_ITEM', { category: 'weapon', itemId: 'shop_bat', currency: 'gold' });
  const baseline = act(state, 'START_BOSS_FIGHT', { bossId: '2' });
  const upgraded = act(act(state, 'EQUIP_SHOP_WEAPON', { weaponId: 'shop_bat' }), 'START_BOSS_FIGHT', { bossId: '2' });
  const normal = act(baseline, 'BOSS_SKILL', { skillId: 'jab', now: baseline.battle.startedAt + 1 });
  const better = act(upgraded, 'BOSS_SKILL', { skillId: 'jab', now: upgraded.battle.startedAt + 1 });
  assert.ok(better.battle.lastHit.damage > normal.battle.lastHit.damage);
});

test('opening map raids and old notifications never starts or restarts raids', () => {
  let state = { ...createInitialState(), energy: 100 };
  const raidId = state.mapRaids[0].id;
  state = act(state, 'OPEN_MAP_RAID', { raidId });
  assert.equal(state.showRaidModal, true);
  assert.equal(state.energy, 100);
  assert.equal(state.mapRaids[0].isRunning, false);
  state = act(state, 'START_RAID', { raidId });
  const afterCost = state.energy;
  const finish = state.mapRaids[0].endTime;
  state = act(state, 'OPEN_MAP_RAID', { raidId });
  assert.equal(state.energy, afterCost);
  assert.equal(state.mapRaids[0].endTime, finish);
  const realNow = Date.now;
  try {
    Date.now = () => finish + 1;
    state = act(state, 'CHECK_RAIDS');
    assert.equal(state.notifications[0].raidId, raidId);
    state = act(state, 'CLAIM_RAID_REWARD', { raidId });
    assert.equal(state.mapRaids[0].isRunning, false);
    assert.equal(state.mapRaids[0].completed, true);
    assert.equal(state.mapRaids[0].endTime, undefined);
    assert.equal(state.showRaidModal, true);
    assert.equal(state.energy, afterCost);
    const xp = state.experience;
    state = act(state, 'OPEN_MAP_RAID', { raidId }); // старое уведомление или значок на карте
    state = act(state, 'CHECK_RAIDS');
    state = act(state, 'CLAIM_RAID_REWARD', { raidId });
    assert.equal(state.experience, xp);
    assert.equal(state.energy, afterCost);
    assert.equal(state.mapRaids[0].isRunning, false);
    state = act(state, 'START_RAID', { raidId }); // явное нажатие «Начать рейд»
    assert.equal(state.mapRaids[0].isRunning, true);
    assert.equal(state.energy, afterCost - state.mapRaids[0].energyCost);
    assert.equal(state.mapRaids[0].completed, false);
  } finally { Date.now = realNow; }
});

test('daily contracts track real activities and give the stated rewards only once', () => {
  let state = { ...createInitialState(), energy: 100, matches: 100, inventory: Array.from({ length: 5 }, () => ({ itemId: 'scrap_metal', equipped: false })) };
  const quest = (id) => state.daily.quests.find((item) => item.questId === id);
  state = act(state, 'DO_TASK', { taskId: 'sg1' });
  state = act(state, 'DO_TASK', { taskId: 'sg1' });
  state = act(state, 'DO_TASK', { taskId: 'sg1' });
  assert.equal(quest('q2').progress, 3);
  state = act(state, 'UPGRADE_CAR');
  assert.equal(quest('q4').completed, true);
  state = act(state, 'CRAFT_ITEM', { recipeId: 'repair_kit' });
  assert.equal(quest('q5').completed, true);
  const raid = state.mapRaids[0];
  state = { ...state, mapRaids: [{ ...raid, isRunning: true, endTime: Date.now() - 1 }] };
  state = act(state, 'CLAIM_RAID_REWARD', { raidId: raid.id });
  assert.equal(quest('q3').completed, true);
  const before = { bullets: state.bullets, experience: state.experience, premiumGold: state.premiumGold };
  state = act(state, 'CLAIM_QUEST_REWARD', { questId: 'q3' });
  assert.equal(state.bullets, before.bullets + 40);
  assert.equal(state.experience, before.experience + 20);
  assert.equal(state.premiumGold, before.premiumGold);
  state = act(state, 'CLAIM_QUEST_REWARD', { questId: 'q3' });
  assert.equal(state.experience, before.experience + 20);
  for (let i = 0; i < 3; i++) {
    state = act(state, 'START_BOSS_FIGHT', { bossId: '1' });
    state = { ...state, battle: { ...state.battle, bossHp: 1 } };
    state = act(state, 'BOSS_SKILL', { skillId: 'jab', now: state.battle.startedAt + 1 });
    state = act(state, 'LEAVE_BATTLE');
  }
  assert.equal(quest('q1').completed, true);
  assert.equal(quest('q6').progress, 3);
  const beforeBonus = { bullets: state.bullets, gold: state.gold, medkits: state.medkits };
  state = act(state, 'CLAIM_DAILY_QUEST_BONUS');
  assert.equal(state.bullets, beforeBonus.bullets + 100);
  assert.equal(state.gold, beforeBonus.gold + 50);
  assert.equal(state.medkits, beforeBonus.medkits + 1);
  state = act(state, 'CLAIM_DAILY_QUEST_BONUS');
  assert.equal(state.bullets, beforeBonus.bullets + 100);
  state = act(state, 'CLAIM_QUEST_REWARD', { questId: 'q6' });
  assert.equal(quest('q6').claimed, true);
});

test('daily quests migrate previous progress and reset once at local midnight', () => {
  const original = createInitialState();
  const legacy = { ...original, daily: { ...original.daily, quests: [
    { questId: 'q1', progress: 1, completed: true, claimed: true },
    { questId: 'q6', progress: 4, completed: false, claimed: false },
    { questId: 'q8', progress: 0, completed: false, claimed: false },
  ] } };
  delete legacy.daily.questDate;
  delete legacy.daily.questBonusClaimed;
  let state = hydrateState(legacy);
  assert.equal(state.daily.quests.find((q) => q.questId === 'q1').claimed, true);
  assert.equal(state.daily.quests.find((q) => q.questId === 'q6').completed, true);
  assert.equal(state.daily.quests.length, 6);
  assert.equal(act(state, 'CLAIM_DAILY_QUEST_BONUS').daily.questBonusClaimed, false);
  const now = Date.now;
  try {
    Date.now = () => now() + 2 * 24 * 60 * 60 * 1000;
    state = act(state, 'RESTORE_ENERGY_TICK');
    assert.ok(state.daily.quests.every((q) => q.progress === 0 && !q.claimed));
    assert.equal(state.daily.questBonusClaimed, false);
    assert.equal(state.daily.questDate, todayLocal(Date.now()));
  } finally { Date.now = now; }
});
