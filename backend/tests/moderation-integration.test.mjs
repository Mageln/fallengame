import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
import express from 'express';
import { PGlite } from '../../node_modules/@electric-sql/pglite/dist/index.js';

const db = new PGlite();
await db.exec(await readFile(new URL('../prisma/migrations/20261109_moderation/migration.sql', import.meta.url), 'utf8'));
const raw = (client) => ({
  $queryRaw: async (parts, ...values) => (await client.query(parts.reduce((a, p, i) => a + (i ? `$${i}` : '') + p, ''), values)).rows,
  $executeRaw: async (parts, ...values) => (await client.query(parts.reduce((a, p, i) => a + (i ? `$${i}` : '') + p, ''), values)).affectedRows,
});
globalThis.testModerationPrisma = { ...raw(db), playerProgress: { findUnique: async ({ where }) => where.vkId === 4 ? { vkId: 4 } : null }, $transaction: (cb) => db.transaction((tx) => cb(raw(tx))) };
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await build({ stdin: { contents: "export { moderationRouter } from './src/routes/moderation.ts'; export { requireVkUser } from './src/vkAuth.ts';", resolveDir: new URL('..', import.meta.url).pathname }, outfile: new URL('../dist/moderation-test.mjs', import.meta.url).pathname, bundle: true, platform: 'node', format: 'esm', external: ['express'], plugins: [{ name: 'prisma-fixture', setup(b) { b.onResolve({ filter: /prisma\.js$/ }, () => ({ path: 'fake-prisma', namespace: 'fake' })); b.onLoad({ filter: /.*/, namespace: 'fake' }, () => ({ contents: 'export const prisma = globalThis.testModerationPrisma;', loader: 'js' })); } }] });
const { moderationRouter, requireVkUser } = await import('../dist/moderation-test.mjs');
process.env.VK_APP_SECRET = 'integration-test-secret'; process.env.ADMIN_VK_IDS = '1'; process.env.MODERATOR_VK_IDS = '2'; delete process.env.VK_APP_ID;
const app = express(); app.use(express.json()); app.use('/api/moderation', moderationRouter); app.get('/protected', requireVkUser, (_req, res) => res.json({ ok: true }));
const server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
after(async () => { await new Promise(resolve => server.close(resolve)); await db.close(); delete globalThis.testModerationPrisma; });
const params = (id) => {
  const p = new URLSearchParams({ vk_user_id: String(id), vk_ts: String(Math.floor(Date.now()/1000)) }); p.sort();
  p.set('sign', createHmac('sha256', process.env.VK_APP_SECRET).update(p.toString()).digest('base64url')); return p.toString();
};
const call = (path, id, body, launch = params(id)) => fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'X-VK-Launch-Params': launch }, ...(body ? { body: JSON.stringify(body) } : {}) });

test('signed staff can ban and unban; forbidden actors, self and staff cannot be banned', async () => {
  assert.equal((await call('/api/moderation/ban', 4, { targetVkId: 4, reason: 'спам', durationHours: 24 })).status, 403);
  assert.equal((await call('/api/moderation/ban', 2, { targetVkId: 1, reason: 'спам', durationHours: 24 })).status, 403);
  assert.equal((await call('/api/moderation/ban', 2, { targetVkId: 2, reason: 'спам', durationHours: 24 })).status, 403);
  assert.equal((await call('/api/moderation/ban', 2, { targetVkId: 4, reason: 'спам', durationHours: 24 }, 'vk_user_id=2&sign=forged')).status, 401);
  assert.equal((await call('/api/moderation/ban', 2, { targetVkId: 999, reason: 'спам', durationHours: 24 })).status, 404);
  assert.equal((await call('/api/moderation/ban', 2, { targetVkId: 4, reason: 'спам', durationHours: 24 })).status, 200);
  const blocked = await call('/protected', 4); assert.equal(blocked.status, 403); assert.equal((await blocked.json()).reason, 'спам');
  assert.equal((await call('/api/moderation/unban', 1, { targetVkId: 4 })).status, 200);
  assert.equal((await call('/protected', 4)).status, 200);
  const audit = await db.query('SELECT "action", "actorVkId" FROM "ModerationAudit" ORDER BY "id"'); assert.deepEqual(audit.rows.map(r => [r.action,r.actorVkId]), [['ban',2],['unban',1]]);
});
test('expired bans stop blocking; permanent bans continue to block', async () => {
  await db.query('INSERT INTO "PlayerBan" ("vkId", "reason", "expiresAt", "actorVkId") VALUES (4, $1, CURRENT_TIMESTAMP - INTERVAL \'1 hour\', 2)', ['срок истёк']);
  assert.equal((await call('/protected', 4)).status, 200);
  assert.equal((await call('/api/moderation/ban', 2, { targetVkId: 4, reason: 'нарушение', durationHours: null })).status, 200);
  const response = await call('/protected', 4); assert.equal(response.status, 403); assert.equal((await response.json()).expiresAt, null);
});
test('ban database failures fail closed instead of allowing protected requests', async () => {
  const query = globalThis.testModerationPrisma.$queryRaw;
  globalThis.testModerationPrisma.$queryRaw = async () => { throw new Error('database unavailable'); };
  try { assert.equal((await call('/protected', 4)).status, 503); }
  finally { globalThis.testModerationPrisma.$queryRaw = query; }
});
