import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const { SHOP_CLOTHING, clothingSlot } = await vite.ssrLoadModule('/src/game/shopCatalog.ts');
const { gameReducer, hydrateState } = await vite.ssrLoadModule('/src/game/reducer.ts');
const { createInitialState } = await vite.ssrLoadModule('/src/game/initialState.ts');
const { equippedClothingVisuals, clothingVisualPath } = await vite.ssrLoadModule('/src/game/clothingVisuals.ts');
const { ClothingLayers } = await vite.ssrLoadModule('/src/components/ClothingLayers.tsx');
const { LOCATIONS, ROOM_SKINS, resolveBackground } = await vite.ssrLoadModule('/src/game/constants.ts');
const { drawCharacter } = await vite.ssrLoadModule('/src/components/FallenCanvas/drawCharacter.ts');
const act = (s, type, args) => gameReducer(s, { type, ...args });

test('clothing catalog keeps legacy items working and sells two military sets by parts', async () => {
  const { shopClothingEntries, isLegacyClothingId } = await vite.ssrLoadModule('/src/game/shopCatalog.ts');
  assert.equal(SHOP_CLOTHING.length, 28);
  const military = shopClothingEntries();
  assert.equal(military.length, 8);
  for (const slot of ['head', 'body', 'legs', 'feet']) {
    assert.equal(SHOP_CLOTHING.filter(e => e.slot === slot && !e.item.id.startsWith('mil_')).length, 5);
    assert.equal(military.filter(e => e.slot === slot).length, 2);
  }
  for (const entry of military) {
    assert.deepEqual(entry.currencies, ['gold', 'premium']);
    assert.equal(entry.effect, undefined);
    const png = await readFile(`public${entry.image}`);
    assert.equal(png.readUInt32BE(16), 402); assert.equal(png.readUInt32BE(20), 600);
    assert.equal(clothingVisualPath(entry.item.id), entry.image);
  }
  assert.ok(isLegacyClothingId('shop_cap')); assert.ok(!isLegacyClothingId('mil_scout_body'));
  assert.deepEqual(new Set(SHOP_CLOTHING.map(e => e.slot)), new Set(['head', 'body', 'legs', 'feet']));
  assert.equal(clothingSlot('shop_pants'), 'legs'); assert.equal(clothingSlot('shop_boots'), 'feet');
  for (const item of SHOP_CLOTHING) {
    for (const currency of item.currencies) assert.ok(item.price[currency] > 0);
    if (item.effect) assert.deepEqual(item.currencies, ['premium']);
    await access(`public${item.image}`);
  }
  for (const id of equippedClothingVisuals(SHOP_CLOTHING.filter(e => !e.item.id.startsWith('mil_')).map(e => e.item.id))) {
    const svg = await readFile(`public${clothingVisualPath(id)}`, 'utf8');
    assert.match(svg, /viewBox="0 0 402 600"/);
  }
});

test('military parts purchase, equip, replacement, reload and unequip preserve other slots', () => {
  let state = { ...createInitialState(), gold: 10000 };
  const legacy = act(state, 'BUY_SHOP_ITEM', { category: 'clothing', itemId: 'shop_cap', currency: 'gold' });
  assert.equal(legacy.gold, state.gold); assert.equal(legacy.inventory.length, 0);
  for (const id of ['mil_scout_head', 'mil_scout_body', 'mil_scout_legs', 'mil_scout_feet', 'mil_assault_body']) {
    const price = SHOP_CLOTHING.find(e => e.item.id === id).price.gold;
    const before = state.gold;
    state = act(state, 'BUY_SHOP_ITEM', { category: 'clothing', itemId: id, currency: 'gold' });
    assert.equal(state.gold, before - price);
    const again = act(state, 'BUY_SHOP_ITEM', { category: 'clothing', itemId: id, currency: 'gold' });
    assert.equal(again.gold, state.gold);
  }
  for (const id of ['mil_scout_head', 'mil_scout_body', 'mil_scout_legs', 'mil_scout_feet']) {
    state = act(state, 'EQUIP_ITEM', { slotIndex: state.inventory.findIndex(s => s.itemId === id) });
  }
  assert.deepEqual(new Set(state.equipmentIds.filter(id => id.startsWith('mil_'))), new Set(['mil_scout_head', 'mil_scout_body', 'mil_scout_legs', 'mil_scout_feet']));
  state = hydrateState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(equippedClothingVisuals(state.equipmentIds), ['mil_scout_legs', 'mil_scout_feet', 'mil_scout_body', 'mil_scout_head']);
  state = act(state, 'EQUIP_ITEM', { slotIndex: state.inventory.findIndex(s => s.itemId === 'mil_assault_body') });
  assert.ok(!state.equipmentIds.includes('mil_scout_body')); assert.ok(state.equipmentIds.includes('mil_assault_body'));
  assert.ok(state.equipmentIds.includes('mil_scout_legs')); assert.ok(state.equipmentIds.includes('mil_scout_feet'));
  state = act(state, 'UNEQUIP_ITEM', { slotIndex: state.inventory.findIndex(s => s.itemId === 'mil_scout_legs') });
  assert.ok(!equippedClothingVisuals(state.equipmentIds).includes('mil_scout_legs'));
});

test('character overlay renders only equipped known items in matching order and coordinates', () => {
  const ids = ['shop_boots', 'shop_pants', 'not-a-real-asset'];
  const html = renderToStaticMarkup(React.createElement(ClothingLayers, { equipmentIds: ids, className: 'layer' }));
  assert.match(html, /shop_pants.svg/); assert.match(html, /shop_boots.svg/); assert.doesNotMatch(html, /not-a-real-asset/);
  const calls = []; const ctx = { drawImage: (...args) => calls.push(args) };
  const character = { complete: true, naturalWidth: 402, naturalHeight: 600 };
  const pants = { complete: true, naturalWidth: 402, naturalHeight: 600 };
  const p = { x: 10, y: 20, width: 201, height: 300 };
  drawCharacter(ctx, p, character, '#fff', null, [pants]);
  assert.deepEqual(calls[1], [pants, 0, 0, 402, 600, 10, 20, 201, 300]);
});

test('new room backgrounds exist and existing room skin IDs resolve to new images', async () => {
  for (const item of [...LOCATIONS, ...ROOM_SKINS]) await access(`public/${item.bg}`);
  assert.equal(resolveBackground('location1', {}, ['location1']), 'backgrounds/shelter.jpg');
  assert.equal(resolveBackground('location4', { location4: 'l4_lab' }, ['location1', 'location4']), 'backgrounds/laboratory.jpg');
  await access('public/backgrounds/battle.jpg');
});


test('military parts sell for either currency with balance checks; legacy items are withdrawn', () => {
  for (const entry of SHOP_CLOTHING.filter(e => e.item.id.startsWith('mil_'))) {
    for (const currency of ['gold', 'premium']) {
      const balanceField = currency === 'gold' ? 'gold' : 'premiumGold';
      const initial = { ...createInitialState(), gold: 100000, premiumGold: 100000 };
      const insufficient = act({ ...initial, [balanceField]: entry.price[currency] - 1 }, 'BUY_SHOP_ITEM', { category: 'clothing', itemId: entry.item.id, currency });
      assert.ok(!insufficient.inventory.some(item => item.itemId === entry.item.id));
      let state = act(initial, 'BUY_SHOP_ITEM', { category: 'clothing', itemId: entry.item.id, currency });
      assert.equal(state[balanceField], initial[balanceField] - entry.price[currency]);
      state = act(state, 'EQUIP_ITEM', { slotIndex: state.inventory.findIndex(item => item.itemId === entry.item.id) });
      state = hydrateState(JSON.parse(JSON.stringify(state)));
      assert.ok(state.equipmentIds.includes(entry.item.id));
      assert.ok(equippedClothingVisuals(state.equipmentIds).includes(entry.item.id));
    }
  }
  const initial = { ...createInitialState(), gold: 100000, premiumGold: 100000 };
  for (const entry of SHOP_CLOTHING.filter(e => !e.item.id.startsWith('mil_'))) {
    for (const currency of ['gold', 'premium']) {
      const rejected = act(initial, 'BUY_SHOP_ITEM', { category: 'clothing', itemId: entry.item.id, currency });
      assert.equal(rejected.gold, initial.gold); assert.equal(rejected.premiumGold, initial.premiumGold);
    }
  }
});

test('premium clothing uses animated styles in overlays and glow when rendered on canvas', () => {
  const html = renderToStaticMarkup(React.createElement(ClothingLayers, { equipmentIds: ['head_volt', 'legs_cosmic'], className: 'layer' }));
  assert.equal((html.match(/animated-clothing/g) ?? []).length, 2);
  assert.match(html, /--clothing-glow:#4cdfff/); assert.match(html, /--clothing-glow:#d88fff/);
  const calls = []; const ctx = { drawImage: (...args) => calls.push(args), save: () => calls.push('save'), restore: () => calls.push('restore') };
  const character = { complete: true, naturalWidth: 402, naturalHeight: 600 };
  const item = { complete: true, naturalWidth: 402, naturalHeight: 600, dataset: { clothingId: 'head_volt' } };
  drawCharacter(ctx, { x: 0, y: 0, width: 201, height: 300 }, character, '#fff', null, [item]);
  assert.equal(calls[1], 'save'); assert.equal(calls[2][0], item); assert.equal(calls[3], 'restore');
  assert.equal(ctx.shadowColor, '#4cdfff');
});

test('animated suit is bought with either currency and hides clothing only visually', async () => {
  const { SHOP_SUITS } = await vite.ssrLoadModule('/src/game/shopCatalog.ts');
  const { hasEquippedSuit, clothingEffect } = await vite.ssrLoadModule('/src/game/clothingVisuals.ts');
  const suit = SHOP_SUITS[0];
  assert.equal(suit.item.id, 'suit_fire');
  for (const currency of ['gold', 'premium']) {
    const initial = { ...createInitialState(), gold: 10000, premiumGold: 1000 };
    const balance = currency === 'gold' ? 'gold' : 'premiumGold';
    const short = act({ ...initial, [balance]: suit.price[currency] - 1 }, 'BUY_SHOP_ITEM', { category: 'suit', itemId: suit.item.id, currency });
    assert.equal(short.inventory.length, 0);
    let state = act(initial, 'BUY_SHOP_ITEM', { category: 'suit', itemId: suit.item.id, currency });
    assert.equal(state[balance], initial[balance] - suit.price[currency]);
    assert.equal(act(state, 'BUY_SHOP_ITEM', { category: 'suit', itemId: suit.item.id, currency })[balance], state[balance]);
    state = act(state, 'BUY_SHOP_ITEM', { category: 'clothing', itemId: 'mil_scout_body', currency: 'gold' });
    state = act(state, 'EQUIP_ITEM', { slotIndex: state.inventory.findIndex(s => s.itemId === 'mil_scout_body') });
    state = act(state, 'EQUIP_ITEM', { slotIndex: state.inventory.findIndex(s => s.itemId === suit.item.id) });
    assert.ok(state.equipmentIds.includes('mil_scout_body'));
    assert.ok(hasEquippedSuit(state.equipmentIds));
    assert.deepEqual(equippedClothingVisuals(state.equipmentIds), ['suit_fire', 'suit_fire_lines']);
    state = hydrateState(JSON.parse(JSON.stringify(state)));
    assert.ok(state.equipmentIds.includes('suit_fire'));
    state = act(state, 'EQUIP_ITEM', { slotIndex: state.inventory.findIndex(s => s.itemId === suit.item.id) });
    assert.ok(!hasEquippedSuit(state.equipmentIds));
    assert.deepEqual(equippedClothingVisuals(state.equipmentIds), ['mil_scout_body']);
  }
  const html = renderToStaticMarkup(React.createElement(ClothingLayers, { equipmentIds: ['shop_cap', 'suit_fire'], className: 'layer' }));
  assert.match(html, /suit_fire.png/); assert.match(html, /suit_fire_lines.webp/);
  assert.doesNotMatch(html, /animated-clothing/); assert.doesNotMatch(html, /animated-embers/);
  assert.equal(clothingEffect('suit_fire_lines'), undefined);
  const png = await readFile(`public${clothingVisualPath('suit_fire')}`);
  assert.equal(png.readUInt32BE(16), 402); assert.equal(png.readUInt32BE(20), 600);
  const webp = await readFile(`public${clothingVisualPath('suit_fire_lines')}`);
  assert.equal(webp.subarray(0, 4).toString(), 'RIFF'); assert.equal(webp.subarray(8, 12).toString(), 'WEBP');
  assert.ok(webp.includes(Buffer.from('ANIM')), 'линии должны мигать за счёт анимации внутри файла');
});

test('canvas draws the static suit before the weapon and leaves blinking lines to the DOM layer', () => {
  const calls = [];
  const ctx = { drawImage: (...args) => calls.push(args), save: () => {}, restore: () => {} };
  const image = { complete: true, naturalWidth: 402, naturalHeight: 600 };
  const suit = { ...image, dataset: { clothingId: 'suit_fire' } };
  const lines = { ...image, dataset: { clothingId: 'suit_fire_lines' } };
  const weapon = { ...image };
  drawCharacter(ctx, { x: 0, y: 0, width: 201, height: 300 }, image, '#fff', null, [suit, lines], weapon);
  assert.deepEqual(calls.map(c => c[0]), [image, suit, weapon]);
  assert.equal(calls[1].length, 5);
});

test('leaderboard stays compact in panels and opens as an overlay', async () => {
  const { Leaderboard } = await vite.ssrLoadModule('/src/components/Leaderboard.tsx');
  const html = renderToStaticMarkup(React.createElement(Leaderboard, { kind: 'boss', serverMode: false }));
  assert.match(html, /aria-expanded="false"/); assert.match(html, /РЕЙТИНГ/); assert.doesNotMatch(html, /<ol/);
  const arena = renderToStaticMarkup(React.createElement(Leaderboard, { kind: 'arena', serverMode: true }));
  assert.match(arena, /ПОБЕДЫ НА АРЕНЕ/); assert.doesNotMatch(arena, /<ol/);
});

test('load screen renders the animated splash with sparks and progress', async () => {
  const { LoadScreen } = await vite.ssrLoadModule('/src/components/LoadScreen.tsx');
  const html = renderToStaticMarkup(React.createElement(LoadScreen, { done: false }));
  assert.match(html, /ПОСЛЕДНИЙ РУБЕЖ/); assert.match(html, /role="status"/);
  assert.equal((html.match(/spark/g) ?? []).length >= 16, true);
  assert.match(html, /--spark-delay/);
  assert.equal((html.match(/--stone-x/g) ?? []).length, 5);
});
