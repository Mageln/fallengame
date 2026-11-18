import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());
const { getBossArt, getArenaArt, isEnraged } = await vite.ssrLoadModule('/src/game/enemyArt.ts');
const { getEnemySpriteBounds } = await vite.ssrLoadModule('/src/components/FallenCanvas/drawBossFight.ts');

test('the second phase activates at exactly half HP', () => {
  for (const [hp, max, expected] of [[51, 100, false], [50, 100, true], [49, 100, true], [0, 100, true], [3, 5, false], [2, 5, true], [0, 0, false], [NaN, 100, false]]) {
    assert.equal(isEnraged(hp, max), expected, `${hp}/${max}`);
  }
});

test('six bosses and three arena opponents have existing portraits and two distinct images', async () => {
  const portraits = new Set();
  for (const art of [...['1', '2', '3', '4', 'zombie', 'zombie_brute'].map(getBossArt), ...['raider', 'guard', 'medic'].map(getArenaArt)]) {
    assert.notEqual(art.normal, art.enraged);
    portraits.add(art.face);
    for (const src of [art.face, art.normal, art.enraged]) {
      const bytes = await readFile(`public${src}`);
      assert.equal(bytes.subarray(1, 4).toString(), 'PNG', src);
    }
  }
  assert.equal(portraits.size, 8); // Страж использует образ Департамента.
  assert.equal(getBossArt('constructor').normal, getBossArt('1').normal);
  assert.equal(getArenaArt('constructor').normal, getArenaArt('raider').normal);
});

test('canvas boss sprite keeps its aspect ratio inside the visible space on mobile and desktop', () => {
  for (const [w, h] of [[320, 568], [390, 844], [1920, 1080]]) {
    for (const [iw, ih] of [[280, 720], [473, 720]]) {
      const bounds = getEnemySpriteBounds(w, h, iw, ih);
      assert.ok(bounds.width > 0 && bounds.height > 0);
      assert.ok(bounds.x >= 0 && bounds.y >= 0);
      assert.ok(bounds.x + bounds.width <= w && bounds.y + bounds.height <= h);
      assert.ok(Math.abs(bounds.width / bounds.height - iw / ih) < 0.0001);
    }
  }
});
