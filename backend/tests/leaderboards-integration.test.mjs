import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
import express from 'express';
import { PGlite } from '../../node_modules/@electric-sql/pglite/dist/index.js';
const db = new PGlite();
await db.exec('CREATE TABLE "PlayerProgress" ("vkId" INTEGER PRIMARY KEY); CREATE TABLE "User" ("vkId" INTEGER UNIQUE, "username" TEXT); CREATE TABLE "PlayerBan" ("vkId" INTEGER PRIMARY KEY, "reason" TEXT, "expiresAt" TIMESTAMP);');
await db.exec(await readFile(new URL('../prisma/migrations/20261110_leaderboards/migration.sql', import.meta.url), 'utf8'));
const raw = client => ({
  $queryRaw: async (parts, ...values) => (await client.query(parts.reduce((a, p, i) => a + (i ? `$${i}` : '') + p, ''), values)).rows,
  $executeRaw: async (parts, ...values) => (await client.query(parts.reduce((a, p, i) => a + (i ? `$${i}` : '') + p, ''), values)).affectedRows,
});
globalThis.leaderboardTestDb = raw(db);
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await build({ stdin: { contents: "export { leaderboardRouter } from './src/routes/leaderboards.ts'; export { weekStart, recordScore, scoreDelta } from './src/leaderboards.ts';", resolveDir: new URL('..', import.meta.url).pathname }, outfile: new URL('../dist/leaderboard-test.mjs', import.meta.url).pathname, bundle: true, platform: 'node', format: 'esm', external: ['express'], plugins: [{ name: 'fixture', setup(b) { b.onResolve({ filter: /prisma\.js$/ }, () => ({ path: 'fixture', namespace: 'fake' })); b.onLoad({ filter: /.*/, namespace: 'fake' }, () => ({ contents: 'export const prisma = globalThis.leaderboardTestDb;', loader: 'js' })); } }] });
const { leaderboardRouter, weekStart, recordScore, scoreDelta } = await import('../dist/leaderboard-test.mjs');
process.env.VK_APP_SECRET = 'leaderboard-test-secret'; process.env.LEADERBOARDS_ENABLED = 'true'; delete process.env.VK_APP_ID;
const app = express(); app.use('/api/leaderboards', leaderboardRouter);
const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
after(async () => { await new Promise(resolve => server.close(resolve)); await db.close(); delete globalThis.leaderboardTestDb; });
const params = id => { const p = new URLSearchParams({ vk_user_id: String(id), vk_ts: String(Math.floor(Date.now()/1000)) }); p.sort(); p.set('sign', createHmac('sha256', process.env.VK_APP_SECRET).update(p.toString()).digest('base64url')); return p.toString(); };
const request = (query, id = 1, auth = params(id)) => fetch(`http://127.0.0.1:${server.address().port}/api/leaderboards?${query}`, { headers: { 'X-VK-Launch-Params': auth } });

test('week boundaries use UTC Monday and invalid or non-damaging actions are ignored', () => {
  assert.equal(weekStart(new Date('2026-11-08T23:59:59Z')), '2026-11-02');
  assert.equal(weekStart(new Date('2026-11-09T00:00:00Z')), '2026-11-09');
  const before = { battle: { source: 'boss', startedAt: 1, outcome: 'fighting', damageDealt: 20, bossHp: 100 }, arena: { battle: { outcome: 'fighting' } } };
  const after = { battle: { ...before.battle, damageDealt: 50 }, arena: { battle: { outcome: 'won' } } };
  assert.deepEqual(scoreDelta(before, after, { type: 'BOSS_SKILL' }), { damage: 30, arenaWins: 0 });
  assert.deepEqual(scoreDelta(before, after, { type: 'ARENA_SKILL' }), { damage: 0, arenaWins: 1 });
  assert.deepEqual(scoreDelta({ ...before, battle: { ...before.battle, coopEncounterId: 'x' } }, after, { type: 'BOSS_SKILL' }), { damage: 0, arenaWins: 0 });
  assert.deepEqual(scoreDelta(before, { ...after, battle: { ...after.battle, damageDealt: 5000 } }, { type: 'BOSS_SKILL' }), { damage: 0, arenaWins: 0 });
  assert.deepEqual(scoreDelta(after, after, { type: 'ARENA_SKILL' }), { damage: 0, arenaWins: 0 });
});

test('atomic increments, rollback, top 50, own place, authentication and periods', async () => {
  await db.exec('INSERT INTO "PlayerProgress" SELECT generate_series(1, 55); INSERT INTO "User" VALUES (1, \'Первый\');');
  const now = new Date();
  await db.transaction(async tx => { await recordScore(raw(tx), 1, 150, 2, now); await recordScore(raw(tx), 1, 5, 0, now); });
  await assert.rejects(db.transaction(async tx => { await recordScore(raw(tx), 1, 999, 9, now); throw Error('rollback'); }));
  const scores = await db.query('SELECT * FROM "LeaderboardScore" WHERE "vkId"=1 ORDER BY "period"');
  assert.equal(scores.rows.length, 2); for (const row of scores.rows) { assert.equal(Number(row.bossDamage), 155); assert.equal(Number(row.arenaWins), 2); }
  for (let id = 2; id <= 55; id++) await recordScore(raw(db), id, 200 + id, 1, now);
  const response = await request('kind=boss&period=week'); assert.equal(response.status, 200);
  const data = await response.json(); assert.equal(data.entries.length, 50); assert.equal(data.entries[0].vkId, 55); assert.equal(data.me.position, 55); assert.equal(data.me.score, '155');
  const arena = await (await request('kind=arena&period=all')).json(); assert.equal(arena.entries[0].vkId, 1); assert.equal(arena.entries[0].score, '2'); assert.equal(arena.entries[1].vkId, 2);
  assert.equal((await request('kind=arena&period=all', 1, 'vk_user_id=1&sign=invalid')).status, 401);
  assert.equal((await request('kind=bad&period=all')).status, 400);
  process.env.LEADERBOARDS_ENABLED = 'false'; assert.equal((await request('kind=boss&period=all')).status, 503); process.env.LEADERBOARDS_ENABLED = 'true';
});
