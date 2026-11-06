import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());
const { getCharacterPosition, drawCharacter } = await vite.ssrLoadModule('/src/components/FallenCanvas/drawCharacter.ts');

test('character is centered and anchored above the bottom UI at different screen sizes', () => {
  for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [1920, 1080], [844, 390], [150, 180]]) {
    const p = getCharacterPosition(width, height, 402 / 600);
    assert.ok(Math.abs(p.x + p.width / 2 - width / 2) < 1e-9);
    assert.ok(Math.abs(p.y + p.height - (height - Math.min(86, height * 0.2))) < 1e-9);
    assert.ok(p.y >= 0 && p.x >= 0 && p.x + p.width <= width);
    assert.ok(Math.abs(p.width / p.height - 402 / 600) < 1e-9);
  }
});

test('zero or invalid dimensions do not yield invalid positions', () => {
  for (const p of [getCharacterPosition(0, 0), getCharacterPosition(NaN, Infinity, 0)]) {
    for (const value of Object.values(p)) assert.ok(Number.isFinite(value));
  }
});

test('draws the character using the image proportions and computed destination', () => {
  let args;
  const ctx = { drawImage: (...values) => { args = values; } };
  const image = { complete: true, naturalWidth: 402, naturalHeight: 600 };
  const position = getCharacterPosition(390, 844);
  drawCharacter(ctx, position, image);
  assert.deepEqual(args, [image, 0, 0, 402, 600, position.x, position.y, position.width, position.height]);
});

test('equipped cap is drawn over the head and scales with the character', () => {
  const character = { complete: true, naturalWidth: 402, naturalHeight: 600 };
  const cap = { complete: true, naturalWidth: 512, naturalHeight: 253 };
  for (const [width, height] of [[320, 568], [390, 844], [1920, 1080]]) {
    const calls = [];
    const ctx = { drawImage: (...values) => calls.push(values) };
    const position = getCharacterPosition(width, height);
    drawCharacter(ctx, position, character, '#fff', cap);
    assert.equal(calls.length, 2);
    assert.equal(calls[0][0], character);
    assert.equal(calls[1][0], cap);
    const [, x, y, w, h] = calls[1];
    assert.ok(Math.abs(x - (position.x + position.width * 145 / 402)) < 1e-9);
    assert.ok(Math.abs(y - (position.y + position.height * 23 / 600)) < 1e-9);
    assert.ok(Math.abs(w - position.width * 74 / 402) < 1e-9);
    assert.ok(Math.abs(h - position.height * (74 * 253 / 512) / 600) < 1e-9);
    calls.length = 0;
    drawCharacter(ctx, position, character, '#fff', null);
    assert.equal(calls.length, 1);
  }
});

test('cap position accounts for transparent margins of the character', async () => {
  const { getCapPosition } = await vite.ssrLoadModule('/src/components/FallenCanvas/drawCharacter.ts');
  const visible = { x: 69, y: 21, w: 223, h: 579 };
  const position = { x: 69, y: 21, width: 223, height: 579 };
  const cap = getCapPosition(position, visible, 402, 600, 512, 253);
  for (const [value, expected] of [[cap.x, 145], [cap.y, 23], [cap.width, 74], [cap.height, 74 * 253 / 512]]) {
    assert.ok(Math.abs(value - expected) < 1e-9);
  }
});
