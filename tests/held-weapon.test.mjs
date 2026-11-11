import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const { WEAPONS } = await vite.ssrLoadModule('/src/game/constants.ts');
const { SHOP_WEAPONS } = await vite.ssrLoadModule('/src/game/shopCatalog.ts');
const { heldWeaponPath } = await vite.ssrLoadModule('/src/game/heldWeapon.ts');
const { HeldWeapon } = await vite.ssrLoadModule('/src/components/HeldWeapon.tsx');
const { drawCharacter, getHeldWeaponPosition } = await vite.ssrLoadModule('/src/components/FallenCanvas/drawCharacter.ts');
const { gameReducer, hydrateState } = await vite.ssrLoadModule('/src/game/reducer.ts');
const { createInitialState } = await vite.ssrLoadModule('/src/game/initialState.ts');

test('all existing and store weapons have safe, distinct, full-size hand overlays', async () => {
  const all = [...WEAPONS, ...SHOP_WEAPONS.map(entry => entry.weapon)];
  const paths = new Set();
  for (const weapon of all) {
    const path = heldWeaponPath(weapon.id); assert.ok(path, weapon.id); paths.add(path);
    const png = await readFile(`public${path}`);
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(png.readUInt32BE(16), 402); assert.equal(png.readUInt32BE(20), 600);
  }
  assert.equal(paths.size, all.length);
  assert.equal(heldWeaponPath('__proto__'), undefined); assert.equal(heldWeaponPath('../weapon'), undefined);
});

test('switching equipped weapon and reloading changes the overlay without mutating economy', () => {
  let state = { ...createInitialState(), gold: 1000 };
  state = gameReducer(state, { type: 'BUY_SHOP_ITEM', category: 'weapon', itemId: 'shop_bat', currency: 'gold' });
  const spent = state.gold;
  const starter = heldWeaponPath(state.weapon.id);
  state = gameReducer(state, { type: 'EQUIP_SHOP_WEAPON', weaponId: 'shop_bat' });
  assert.notEqual(heldWeaponPath(state.weapon.id), starter); assert.equal(state.gold, spent);
  state = hydrateState(JSON.parse(JSON.stringify(state)));
  assert.equal(heldWeaponPath(state.weapon.id), '/characters/weapons/shop_bat.png');
  state = gameReducer(state, { type: 'EQUIP_SHOP_WEAPON', weaponId: 'rusty_pistol' });
  assert.equal(heldWeaponPath(state.weapon.id), starter);
});

test('transparent-bound positioning preserves weapon beyond the character silhouette', () => {
  const visible = { x: 69, y: 21, w: 223, h: 579 };
  const result = getHeldWeaponPosition({ x: 69, y: 21, width: 223, height: 579 }, visible, 402, 600);
  assert.deepEqual(result, { x: 0, y: 0, width: 402, height: 600 });
  for (const [width, height] of [[320, 568], [390, 844], [1920, 1080]]) {
    const pos = { x: width * .3, y: height * .2, width: width * .4, height: height * .6 };
    const output = getHeldWeaponPosition(pos, visible, 402, 600);
    assert.ok(output.x < pos.x && output.x + output.width > pos.x + pos.width);
  }
});

test('canvas draws weapon above clothing without affecting old calls or unavailable sprites', () => {
  const draws = []; const ctx = { drawImage: (...args) => draws.push(args) };
  const character = { complete: true, naturalWidth: 402, naturalHeight: 600 };
  const clothing = { complete: true, naturalWidth: 402, naturalHeight: 600 };
  const weapon = { complete: true, naturalWidth: 402, naturalHeight: 600 };
  drawCharacter(ctx, { x: 10, y: 20, width: 201, height: 300 }, character, '#fff', null, [clothing], weapon);
  assert.equal(draws.length, 3); assert.equal(draws[0][0], character); assert.equal(draws[1][0], clothing); assert.equal(draws[2][0], weapon);
  assert.deepEqual(draws[2], [weapon, 10, 20, 201, 300]);
  assert.equal(renderToStaticMarkup(React.createElement(HeldWeapon, { weaponId: 'invalid', className: 'weapon' })), '');
  assert.match(renderToStaticMarkup(React.createElement(HeldWeapon, { weaponId: 'shop_bat', className: 'weapon' })), /characters\/weapons\/shop_bat.png/);
});
