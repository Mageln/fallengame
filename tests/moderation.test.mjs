import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const { staffRole, canModerate, parseBan } = await vite.ssrLoadModule('/backend/src/moderation.ts');
const { StaffBadge } = await vite.ssrLoadModule('/src/components/StaffBadge.tsx');
const env = { ADMIN_VK_IDS: '1, 2', MODERATOR_VK_IDS: '2,3,invalid' };
test('staff roles come only from server configuration, admin wins overlap', () => {
  assert.equal(staffRole(1, env), 'admin'); assert.equal(staffRole(2, env), 'admin'); assert.equal(staffRole(3, env), 'moderator'); assert.equal(staffRole(4, env), 'player');
  assert.equal(canModerate(4, 5, env), false); assert.equal(canModerate(3, 1, env), false); assert.equal(canModerate(1, 3, env), false); assert.equal(canModerate(1, 1, env), false); assert.equal(canModerate(3, 4, env), true);
});
test('ban parameters are validated and cannot include spoofed fields', () => {
  assert.deepEqual(parseBan({ targetVkId: 4, reason: ' Правила ', durationHours: null }), { target: 4, reason: 'Правила', durationHours: null });
  assert.equal(parseBan({ targetVkId: 4, reason: 'спам', durationHours: 24, actorId: 1 }), null);
  for (const durationHours of [0, -1, 1.5, 8761, '24', undefined]) assert.equal(parseBan({ targetVkId: 4, reason: 'спам', durationHours }), null);
  for (const reason of ['', '  ', 'a', 'x'.repeat(301)]) assert.equal(parseBan({ targetVkId: 4, reason, durationHours: 24 }), null);
});
test('badges distinguish staff and do not mark regular players', () => {
  assert.equal(renderToStaticMarkup(React.createElement(StaffBadge, { role: 'player' })), '');
  assert.match(renderToStaticMarkup(React.createElement(StaffBadge, { role: 'admin' })), /АДМИН/);
  assert.match(renderToStaticMarkup(React.createElement(StaffBadge, { role: 'moderator' })), /МОДЕРАТОР/);
});
