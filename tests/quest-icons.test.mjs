import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const { QUEST_ICONS, QUEST_CHEST_ICON, QuestIcon, QuestChestIcon } = await vite.ssrLoadModule('/src/components/QuestIcon.tsx');
const { DAILY_QUESTS } = await vite.ssrLoadModule('/src/game/constants.ts');

test('each daily quest has its own existing decorative illustrated icon', async () => {
  assert.deepEqual(Object.keys(QUEST_ICONS).sort(), DAILY_QUESTS.map((quest) => quest.id).sort());
  assert.equal(new Set(Object.values(QUEST_ICONS)).size, DAILY_QUESTS.length);
  for (const quest of DAILY_QUESTS) {
    const src = QUEST_ICONS[quest.id];
    const bytes = await readFile(`public${src}`);
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    const html = renderToStaticMarkup(React.createElement(QuestIcon, { questId: quest.id }));
    assert.ok(html.includes(`src="${src}"`));
    assert.ok(html.includes('alt=""'));
  }
  assert.equal(renderToStaticMarkup(React.createElement(QuestIcon, { questId: 'constructor' })), '');
});

test('reward chest exists, and both quest panels use icons without their old emoji', async () => {
  assert.equal((await readFile(`public${QUEST_CHEST_ICON}`)).subarray(1, 4).toString(), 'PNG');
  assert.ok(renderToStaticMarkup(React.createElement(QuestChestIcon)).includes(QUEST_CHEST_ICON));
  for (const path of ['src/panels/QuestBoard.tsx', 'src/panels/Quests.tsx']) {
    const source = await readFile(path, 'utf8');
    assert.match(source, /<QuestIcon questId=\{quest\.id\}/);
    assert.match(source, /<QuestChestIcon/);
    assert.match(source, /<ResourceIcon name="experience"/);
    assert.doesNotMatch(source, /[⚔🏚🎒🚗🔧☠📦⭐🎁✅]/u);
  }
});
