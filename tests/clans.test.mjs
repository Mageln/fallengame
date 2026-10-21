import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());

const { createInitialState } = await vite.ssrLoadModule('/src/game/initialState.ts');
const { gameReducer, hydrateState } = await vite.ssrLoadModule('/src/game/reducer.ts');
const { CLAN_CONTRACTS, clanPeriodKey, getContractProgress, clanRating } = await vite.ssrLoadModule('/src/game/clans.ts');
const { CLAN_COST, CONTRACTS, periodKey } = await vite.ssrLoadModule('/backend/src/clanRules.ts');
const { verifyVkLaunch } = await vite.ssrLoadModule('/backend/src/vkAuth.ts');

const survivor = (id, name, gold = 2500) => gameReducer({ ...createInitialState(), gold }, { type: 'SET_PLAYER', id, name });
const founded = (id = 'leader', name = 'Дозор') => gameReducer(survivor(id, 'Дозорный'), { type: 'CREATE_CLAN', name, emblem: 'mask' });

test('creation deducts exactly 2500 and stores a ranked shelter', () => {
  assert.equal(CLAN_COST, 2500);
  const tooPoor = gameReducer(survivor('p', 'Игрок', 2499), { type: 'CREATE_CLAN', name: 'Ночной дозор', emblem: 'axe' });
  assert.equal(tooPoor.gold, 2499);
  assert.equal(tooPoor.clan, null);

  const created = founded();
  assert.equal(created.gold, 0);
  assert.equal(created.clan.name, 'Дозор');
  assert.equal(created.clan.emblem, 'mask');
  assert.equal(created.clan.members.length, 1);
  assert.equal(created.clan.leaderId, 'leader');
  assert.equal(created.clan.rating, clanRating(created.clan));
  assert.equal(created.clanDirectory[0].id, created.clan.id);
  assert.equal(gameReducer(created, { type: 'CREATE_CLAN', name: 'Второй клан', emblem: 'skull' }).gold, 0);
});

test('invalid names, profanity, duplicate names and invalid emblems are rejected', () => {
  const original = founded('one', 'Последний рубеж');
  for (const name of ['Я', 'а'.repeat(21), 'Бляха', 'Лагерь🚀', ' последний   Рубеж ']) {
    const candidate = { ...survivor('two', 'Другой'), clanDirectory: original.clanDirectory };
    const next = gameReducer(candidate, { type: 'CREATE_CLAN', name, emblem: 'skull' });
    assert.equal(next.clan, null, `rejected: ${name}`);
    assert.equal(next.gold, 2500);
  }
  const invalid = gameReducer(survivor('two', 'Другой'), { type: 'CREATE_CLAN', name: 'Надежда', emblem: 'dragon' });
  assert.equal(invalid.clan, null);
});

test('application is visible to leader; acceptance updates member bonus and applicant membership', () => {
  const leader = founded();
  const applicant = { ...survivor('visitor', 'Медик', 0), clanDirectory: leader.clanDirectory };
  const sent = gameReducer(applicant, { type: 'APPLY_TO_CLAN', clanId: leader.clan.id });
  assert.equal(sent.pendingClanId, leader.clan.id);
  assert.equal(sent.clanDirectory[0].applications[0].userName, 'Медик');
  const withRequest = gameReducer(leader, { type: 'SYNC_CLANS', clans: sent.clanDirectory });
  const approved = gameReducer(withRequest, { type: 'RESOLVE_CLAN_APPLICATION', clanId: leader.clan.id, userId: 'visitor', accept: true });
  assert.equal(approved.clan.members.length, 2);
  assert.equal(approved.clan.rating, 50);
  const joined = gameReducer(sent, { type: 'SYNC_CLANS', clans: approved.clanDirectory });
  assert.equal(joined.pendingClanId, null);
  assert.equal(joined.clan.id, leader.clan.id);
  assert.equal(gameReducer(joined, { type: 'APPLY_TO_CLAN', clanId: leader.clan.id }).clanDirectory.length, 1);
});

test('contracts award rating once per period and refresh progress in a new period', () => {
  let state = founded();
  state = gameReducer(state, { type: 'CLAN_TASK_EVENT', event: 'zombie', amount: 99 });
  assert.equal(state.clan.taskPoints, 0);
  state = gameReducer(state, { type: 'CLAN_TASK_EVENT', event: 'zombie', amount: 1 });
  assert.equal(state.clan.taskPoints, 500);
  assert.equal(state.clan.rating, 525);
  assert.equal(state.clanDirectory[0].rating, 525);
  assert.ok(state.notifications.some((notice) => notice.text.includes('+500')));
  state = gameReducer(state, { type: 'CLAN_TASK_EVENT', event: 'zombie', amount: 1 });
  assert.equal(state.clan.taskPoints, 500);
  const contract = CLAN_CONTRACTS.find((entry) => entry.id === 'clear_streets');
  assert.equal(getContractProgress({ ...state.clan, taskProgress: { clear_streets: { periodKey: '2020-01-01', value: 100, completed: true } } }, contract).value, 0);
  for (const task of CLAN_CONTRACTS) {
    assert.equal(CONTRACTS[task.id].points, task.points);
    assert.equal(CONTRACTS[task.id].target, task.target);
  }
  assert.equal(clanPeriodKey('weekly', new Date('2026-01-01T08:00:00Z')), periodKey('weekly', new Date('2026-01-01T08:00:00Z')));
});

test('game events advance raid, medkit and barricade contracts without double credit', () => {
  let state = founded();
  const raid = state.mapRaids[0];
  state = {
    ...state,
    mapRaids: state.mapRaids.map((entry) => entry.id === raid.id ? { ...entry, isRunning: true, endTime: Date.now() - 10 } : entry),
  };
  state = gameReducer(state, { type: 'CLAIM_RAID_REWARD', raidId: raid.id });
  assert.equal(state.clan.taskProgress.clan_raids.value, 1);
  assert.equal(gameReducer(state, { type: 'CLAIM_RAID_REWARD', raidId: raid.id }).clan.taskProgress.clan_raids.value, 1);

  state = gameReducer({ ...state, raid: { raidId: 'house', scouted: true, pathClear: true, cratesLooted: false } }, { type: 'RAID_LOOT' });
  assert.equal(state.clan.taskProgress.medkit_stock.value, 1);
  assert.equal(gameReducer(state, { type: 'RAID_LOOT' }).clan.taskProgress.medkit_stock.value, 1);

  state = gameReducer({ ...state, matches: 20, inventory: Array.from({ length: 12 }, () => ({ itemId: 'scrap_metal', equipped: false })) }, { type: 'CRAFT_ITEM', recipeId: 'barricade' });
  assert.equal(state.clan.taskProgress.barricade.value, 1);
  assert.equal(state.clan.taskPoints, 700);
  assert.equal(state.inventory.filter((item) => item.itemId === 'barricade').length, 1);
});

test('old saves keep their clan membership and war statistics', () => {
  const old = createInitialState();
  old.playerId = 'veteran';
  old.clan = { name: 'Старая стена', score: 12, members: 3, warRating: 19, warWins: 2, warLosses: 1, warStreak: 1 };
  delete old.clanDirectory;
  const loaded = hydrateState(old);
  assert.equal(loaded.clan.members.length, 3);
  assert.equal(loaded.clan.warWins, 2);
  assert.equal(loaded.clanDirectory[0].name, 'Старая стена');
});

test('VK launch signature verifies authenticated clan operations', () => {
  const params = new URLSearchParams({ vk_app_id: '42', vk_user_id: '123', vk_ts: String(Math.floor(Date.now() / 1000)), vk_platform: 'desktop_web' });
  params.sort();
  const signature = createHmac('sha256', 'test-secret').update(params.toString()).digest('base64url');
  params.set('sign', signature);
  assert.equal(verifyVkLaunch(params.toString(), 'test-secret'), 123);
  params.set('vk_user_id', '124');
  assert.equal(verifyVkLaunch(params.toString(), 'test-secret'), null);
  assert.equal(verifyVkLaunch(params.toString(), undefined), null);
});
