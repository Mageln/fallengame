import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { build } from 'esbuild';

// Bundle the actual server handler with the same engine as backend/scripts.
const bundled = await build({ entryPoints: ['backend/src/coopProgress.ts'], bundle: true, platform: 'node', format: 'esm', write: false,
  plugins: [{ name: 'engine', setup(b) { b.onResolve({ filter: /^\.\/generated\/game\.js$/ }, () => ({ path: resolve('backend/scripts/progress-engine.ts') })); } }] });
const { applyCoopProgressAction, syncCoopBattle } = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].contents).toString('base64'));
const core = await build({ entryPoints: ['backend/scripts/progress-engine.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { createInitialState } = await import('data:text/javascript;base64,' + Buffer.from(core.outputFiles[0].contents).toString('base64'));
const casino = await build({ entryPoints: ['backend/src/coopBoss.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { claimCoopRewards } = await import('data:text/javascript;base64,' + Buffer.from(casino.outputFiles[0].contents).toString('base64'));
const adapter = tx => {
  const query = (strings, values) => tx.query(strings.reduce((sql, text, i) => sql + (i ? `$${i}` : '') + text, ''), values);
  return { $executeRaw: async (s, ...v) => (await query(s, v)).affectedRows, $queryRaw: async (s, ...v) => (await query(s, v)).rows };
};

test('two server players share one boss and receive rewards exactly once', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE TABLE "PlayerProgress" ("vkId" INTEGER PRIMARY KEY, "state" JSONB NOT NULL, "revision" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    await db.exec(await readFile('backend/prisma/migrations/20261107_shared_boss/migration.sql', 'utf8'));
    await db.exec(await readFile('backend/prisma/migrations/20261108_boss_keys/migration.sql', 'utf8'));
    for (const id of [101, 202, 303]) await db.query('INSERT INTO "PlayerProgress" ("vkId", "state") VALUES ($1, $2::jsonb)', [id, JSON.stringify({ ...createInitialState(), bossKeys: { '1': 1 } })]);
    let now = Date.now();
    const act = (vkId, action) => db.transaction(async raw => {
      const tx = adapter(raw);
      const p = (await raw.query('SELECT "state", "revision" FROM "PlayerProgress" WHERE "vkId"=$1 FOR NO KEY UPDATE', [vkId])).rows[0];
      const result = await applyCoopProgressAction(tx, p.state, action, vkId, p.revision, now += 300);
      await raw.query('UPDATE "PlayerProgress" SET "state"=$1::jsonb, "revision"="revision"+1 WHERE "vkId"=$2', [JSON.stringify(result), vkId]);
      const claimed = await claimCoopRewards(tx, vkId);
      return syncCoopBattle(tx, claimed.state, vkId, now);
    });
    let a = await act(101, { type: 'START_BOSS_FIGHT', bossId: '1' });
    let b = await act(202, { type: 'START_BOSS_FIGHT', bossId: '1' });
    assert.equal(a.battle.coopEncounterId, b.battle.coopEncounterId);
    const spectator = await act(303, { type: 'START_BOSS_FIGHT', bossId: '1' });
    assert.equal(spectator.battle.coopEncounterId, a.battle.coopEncounterId);
    const initialHp = a.battle.bossHp;
    a = await act(101, { type: 'BOSS_SKILL', skillId: 'jab' });
    b = await act(202, { type: 'BOSS_SKILL', skillId: 'jab' });
    assert.equal(b.battle.coopParticipants, 2);
    assert.equal(b.battle.bossHp, initialHp - a.battle.damageDealt - b.battle.damageDealt);
    for (let i = 0; i < 20 && b.battle.outcome === 'fighting'; i++) b = await act(202, { type: 'BOSS_SKILL', skillId: 'jab' });
    assert.equal(b.battle.outcome, 'won');
    const spectatorResult = await act(303, { type: 'BOSS_TICK' });
    assert.equal(spectatorResult.battle.outcome, 'lost');
    assert.equal(spectatorResult.experience, 0);
    a = await act(101, { type: 'BOSS_TICK' });
    assert.equal(a.battle.outcome, 'won'); assert.equal(a.battle.bossHp, 0);
    assert.equal(a.bossKeys['2'], 1); assert.equal(b.bossKeys['2'], 1);
    assert.equal(spectatorResult.bossKeys['2'], undefined);
    assert.equal(a.experience + b.experience, 110);
    assert.equal(a.gold + b.gold, 200); assert.equal(a.bullets + b.bullets, 15);
    assert.equal(a.pendingRoomDrop, null); assert.equal(b.pendingRoomDrop, null);
    const before = { xp: a.experience, gold: a.gold, bullets: a.bullets };
    a = await act(101, { type: 'LEAVE_BATTLE' });
    assert.equal(a.battle, null);
    assert.deepEqual({ xp: a.experience, gold: a.gold, bullets: a.bullets }, before);
    const rewards = (await db.query('SELECT "claimedAt" FROM "CoopBossReward"')).rows;
    assert.equal(rewards.length, 2); assert.ok(rewards.every(r => r.claimedAt));
  } finally { await db.close(); }
});

test('coop hits record weekly and all-time leaderboard scores exactly once', async () => {
  process.env.LEADERBOARDS_ENABLED = 'true';
  const db = new PGlite();
  try {
    await db.exec('CREATE TABLE "PlayerProgress" ("vkId" INTEGER PRIMARY KEY, "state" JSONB NOT NULL, "revision" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    await db.exec(await readFile('backend/prisma/migrations/20261107_shared_boss/migration.sql', 'utf8'));
    await db.exec(await readFile('backend/prisma/migrations/20261108_boss_keys/migration.sql', 'utf8'));
    await db.exec(await readFile('backend/prisma/migrations/20261110_leaderboards/migration.sql', 'utf8'));
    for (const id of [101, 202]) await db.query('INSERT INTO "PlayerProgress" ("vkId", "state\") VALUES ($1, $2::jsonb)', [id, JSON.stringify({ ...createInitialState(), bossKeys: { '1': 1 } })]);
    let now = Date.now();
    const act = (vkId, action) => db.transaction(async raw => {
      const tx = adapter(raw);
      const p = (await raw.query('SELECT "state", "revision" FROM "PlayerProgress" WHERE "vkId"=$1 FOR NO KEY UPDATE', [vkId])).rows[0];
      const result = await applyCoopProgressAction(tx, p.state, action, vkId, p.revision, now += 300);
      await raw.query('UPDATE "PlayerProgress" SET "state"=$1::jsonb, "revision"="revision"+1 WHERE "vkId"=$2', [JSON.stringify(result), vkId]);
      return syncCoopBattle(tx, result, vkId, now);
    });
    await act(101, { type: 'START_BOSS_FIGHT', bossId: '1' });
    const hit = await act(101, { type: 'BOSS_SKILL', skillId: 'jab' });
    assert.ok(hit.battle.damageDealt > 0);
    const rows = (await db.query('SELECT "period", "bossDamage", "arenaWins" FROM "LeaderboardScore" WHERE "vkId"=101 ORDER BY "period"')).rows;
    assert.equal(rows.length, 2);
    for (const row of rows) { assert.equal(Number(row.bossDamage), hit.battle.damageDealt); assert.equal(Number(row.arenaWins), 0); }
    const replay = await act(101, { type: 'BOSS_TICK' });
    assert.equal(replay.battle.damageDealt, hit.battle.damageDealt);
    const after = (await db.query('SELECT SUM("bossDamage"::bigint) AS total FROM "LeaderboardScore" WHERE "vkId"=101')).rows[0];
    assert.equal(Number(after.total), hit.battle.damageDealt * 2);
  } finally { await db.close(); delete process.env.LEADERBOARDS_ENABLED; }
});
