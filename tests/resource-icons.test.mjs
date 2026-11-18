import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const { ResourceIcon, ResourceText, RESOURCE_ICONS } = await vite.ssrLoadModule('/src/components/ResourceIcon.tsx');

test('all resource icons exist and render with readable labels and constrained dimensions', async () => {
  assert.equal(Object.keys(RESOURCE_ICONS).length, 11);
  for (const [name, resource] of Object.entries(RESOURCE_ICONS)) {
    const bytes = await readFile(`public${resource.src}`);
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG', name);
    const html = renderToStaticMarkup(React.createElement(ResourceIcon, { name }));
    assert.ok(html.includes(`alt="${resource.label}"`));
    assert.ok(html.includes('width:1.35em'));
    assert.ok(html.includes('object-fit:contain'));
  }
  assert.notEqual(RESOURCE_ICONS.supplies.src, RESOURCE_ICONS.premium.src);
});

test('resource message icons render without changing unrelated text or breaking ordinary words', () => {
  const html = renderToStaticMarkup(React.createElement(ResourceText, { text: 'Награда: 🔫 25 · 💰 10 · 🥤 3 · ⭐ 10' }));
  for (const name of ['bullets', 'supplies', 'caps', 'experience']) assert.ok(html.includes(RESOURCE_ICONS[name].src));
  assert.ok(html.includes('Награда:'));
  assert.ok(!html.includes('🔫'));
  assert.equal(renderToStaticMarkup(React.createElement(ResourceText, { text: 'constructor' })), 'constructor');
});
