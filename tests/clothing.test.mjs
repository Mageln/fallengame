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

test('clothing catalog has six unique purchasable pieces and separate leg and feet slots', async () => {
  assert.ok(SHOP_CLOTHING.length >= 6);
  assert.deepEqual(new Set(SHOP_CLOTHING.map(e => e.slot)), new Set(['head', 'body', 'legs', 'feet']));
  assert.equal(clothingSlot('shop_pants'), 'legs'); assert.equal(clothingSlot('shop_boots'), 'feet');
  for (const item of SHOP_CLOTHING) { assert.ok(item.price.gold > 0); await access(`public${item.image}`); }
  for (const id of equippedClothingVisuals(SHOP_CLOTHING.map(e => e.item.id))) {
    const svg = await readFile(`public${clothingVisualPath(id)}`, 'utf8');
    assert.match(svg, /viewBox="0 0 402 600"/);
  }
});

test('purchases, equip, replacement, reload and unequip preserve other slots', () => {
  let state = { ...createInitialState(), gold: 10000 };
  for (const id of ['shop_cap', 'shop_helmet', 'shop_jacket', 'shop_armor', 'shop_pants', 'shop_boots']) {
    const price = SHOP_CLOTHING.find(e => e.item.id === id).price.gold;
    const before = state.gold;
    state = act(state, 'BUY_SHOP_ITEM', { category: 'clothing', itemId: id, currency: 'gold' });
    assert.equal(state.gold, before - price);
    const again = act(state, 'BUY_SHOP_ITEM', { category: 'clothing', itemId: id, currency: 'gold' });
    assert.equal(again.gold, state.gold);
  }
  for (const id of ['shop_helmet', 'shop_jacket', 'shop_pants', 'shop_boots']) {
    const index = state.inventory.findIndex(s => s.itemId === id);
    state = act(state, 'EQUIP_ITEM', { slotIndex: index });
  }
  assert.deepEqual(new Set(state.equipmentIds.filter(id => id.startsWith('shop_'))), new Set(['shop_helmet', 'shop_jacket', 'shop_pants', 'shop_boots']));
  state = hydrateState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(equippedClothingVisuals(state.equipmentIds), ['shop_pants', 'shop_boots', 'shop_jacket', 'shop_helmet']);
  state = act(state, 'EQUIP_ITEM', { slotIndex: state.inventory.findIndex(s => s.itemId === 'shop_armor') });
  assert.ok(!state.equipmentIds.includes('shop_jacket')); assert.ok(state.equipmentIds.includes('shop_armor'));
  assert.ok(state.equipmentIds.includes('shop_pants')); assert.ok(state.equipmentIds.includes('shop_boots'));
  state = act(state, 'UNEQUIP_ITEM', { slotIndex: state.inventory.findIndex(s => s.itemId === 'shop_pants') });
  assert.ok(!equippedClothingVisuals(state.equipmentIds).includes('shop_pants'));
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
