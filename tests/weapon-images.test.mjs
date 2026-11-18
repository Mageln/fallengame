import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { access } from 'node:fs/promises';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const { SHOP_WEAPONS } = await vite.ssrLoadModule('/src/game/shopCatalog.ts');
const { WEAPONS } = await vite.ssrLoadModule('/src/game/constants.ts');
const { weaponImage } = await vite.ssrLoadModule('/src/game/weaponImages.ts');
const { WeaponImage } = await vite.ssrLoadModule('/src/components/WeaponImage.tsx');
const { StoreModal } = await vite.ssrLoadModule('/src/panels/Store.tsx');
const { GameContext } = await vite.ssrLoadModule('/src/game/GameContext.tsx');
const { createInitialState } = await vite.ssrLoadModule('/src/game/initialState.ts');

test('every shop and existing weapon has an available allowlisted image', async () => {
  for (const weapon of [...SHOP_WEAPONS.map(item => item.weapon), ...WEAPONS]) {
    const path = weaponImage(weapon.id);
    assert.ok(path, weapon.id); await access(`public${path}`);
  }
  for (const item of SHOP_WEAPONS) assert.equal(item.image, weaponImage(item.weapon.id));
  assert.equal(weaponImage('__proto__'), undefined);
  assert.equal(weaponImage('../../something'), undefined);
});

test('weapon component displays its picture and keeps a fallback for unknown saved weapons', () => {
  const html = renderToStaticMarkup(React.createElement(WeaponImage, { weapon: SHOP_WEAPONS[0].weapon }));
  assert.match(html, /\/weapon\/shop_knuckles.jpg/); assert.match(html, /Кастет выжившего/);
  const fallback = renderToStaticMarkup(React.createElement(WeaponImage, { weapon: { id: 'old_unknown', name: 'Неизвестное оружие', icon: '⚔' } }));
  assert.match(fallback, /Неизвестное оружие/); assert.match(fallback, /⚔/);
});

test('shop displays new images and legacy owned weapons without changing the game state', () => {
  const state = createInitialState();
  state.storedWeapons = [WEAPONS.find(w => w.id === 'rusty_crowbar')];
  const before = JSON.stringify(state);
  const html = renderToStaticMarkup(React.createElement(GameContext.Provider, { value: { state, dispatch: () => {}, derived: {}, vkUser: null, isLoading: false, serverMode: false } }, React.createElement(StoreModal, { onClose: () => {} })));
  for (const item of SHOP_WEAPONS) assert.ok(html.includes(item.image));
  assert.ok(html.includes('/weapon/rusty_crowbar.jpg')); assert.equal(JSON.stringify(state), before);
});
