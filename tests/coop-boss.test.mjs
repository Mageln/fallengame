import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const { joinCoopBoss, takeCoopDamage, splitCoopRewards, claimCoopRewards } = await vite.ssrLoadModule('/backend/src/coopBoss.ts');

const config = { bossId: 'zombie', maxHp: 100, rewardXp: 101, rewardGold: 51, rewardBullets: 11 };
const adapter = (tx) => {
  const query = (strings, values) => tx.query(strings.reduce((sql, text, i) => sql + (i ? `$${i}` : '') + text, ''), values);
  return { $executeRaw: async (strings, ...values) => (await query(strings, values)).affectedRows,
    $queryRaw: async (strings, ...values) => (await query(strings, values)).rows };
};
const transaction = (db, f) => db.transaction(tx => f(adapter(tx)));

test('shared encounter sums damage, ignores repeated hits, preserves dead boss and creates one reward per participant', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE TABLE "PlayerProgress" ("vkId" INTEGER PRIMARY KEY)');
    await db.exec(await readFile('backend/prisma/migrations/20261107_shared_boss/migration.sql', 'utf8'));
    await db.exec(await readFile('backend/prisma/migrations/20261108_boss_keys/migration.sql', 'utf8'));
    await db.exec('INSERT INTO "PlayerProgress" VALUES (101), (202)');
    const boss = await transaction(db, tx => joinCoopBoss(tx, config));
    const same = await transaction(db, tx => joinCoopBoss(tx, config));
    assert.equal(same.id, boss.id);
    const a = await transaction(db, tx => takeCoopDamage(tx, boss.id, 101, 'first', 40));
    assert.equal(a.hp, 60);
    const a2 = await transaction(db, tx => takeCoopDamage(tx, boss.id, 101, 'second-hit', 30));
    assert.equal(a2.hp, 30);
    const duplicate = await transaction(db, tx => takeCoopDamage(tx, boss.id, 101, 'first', 40));
    assert.equal(duplicate.duplicate, true); assert.equal(duplicate.hp, 30);
    const b = await transaction(db, tx => takeCoopDamage(tx, boss.id, 202, 'second', 60));
    assert.equal(b.damage, 30); assert.equal(b.status, 'dead');
    const replay = await transaction(db, tx => takeCoopDamage(tx, boss.id, 202, 'second', 60));
    assert.equal(replay.duplicate, true); assert.equal(replay.hp, 0);
    const late = await transaction(db, tx => takeCoopDamage(tx, boss.id, 101, 'late', 10));
    assert.equal(late.damage, 0);
    const attackers = (await db.query('SELECT "vkId", "damage" FROM "CoopBossAttacker" ORDER BY "vkId"')).rows;
    assert.deepEqual(attackers, [{ vkId: 101, damage: 70 }, { vkId: 202, damage: 30 }]);
    const rewards = (await db.query('SELECT "vkId", "xp", "gold", "bullets" FROM "CoopBossReward" ORDER BY "vkId"')).rows;
    assert.deepEqual(rewards, [{ vkId: 101, xp: 51, gold: 26, bullets: 6 }, { vkId: 202, xp: 50, gold: 25, bullets: 5 }]);
    const next = await transaction(db, tx => joinCoopBoss(tx, config));
    assert.notEqual(next.id, boss.id); assert.equal(next.hp, 100);
    assert.equal((await db.query('SELECT "hp" FROM "CoopBoss" WHERE "id" = $1', [boss.id])).rows[0].hp, 0);
  } finally { await db.close(); }
});

test('damage and participant registration roll back together on transaction failure', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE TABLE "PlayerProgress" ("vkId" INTEGER PRIMARY KEY)');
    await db.exec(await readFile('backend/prisma/migrations/20261107_shared_boss/migration.sql', 'utf8'));
    await db.exec(await readFile('backend/prisma/migrations/20261108_boss_keys/migration.sql', 'utf8'));
    await db.exec('INSERT INTO "PlayerProgress" VALUES (101)');
    const boss = await transaction(db, tx => joinCoopBoss(tx, config));
    await assert.rejects(transaction(db, async tx => { await takeCoopDamage(tx, boss.id, 101, 'rolled-back', 20); throw new Error('cancel'); }));
    assert.equal((await db.query('SELECT "hp" FROM "CoopBoss"')).rows[0].hp, 100);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM "CoopBossAttacker"')).rows[0].n, 0);
  } finally { await db.close(); }
});

test('rewards are deterministic, conserve the pool, and reject duplicate players', () => {
  const players = [{ vkId: 8, damage: 70 }, { vkId: 3, damage: 30 }];
  assert.deepEqual(splitCoopRewards(players, config), [{ vkId: 3, xp: 51, gold: 26, bullets: 6 }, { vkId: 8, xp: 50, gold: 25, bullets: 5 }]);
  assert.throws(() => splitCoopRewards([players[0], players[0]], config));
  assert.deepEqual(splitCoopRewards([], config), []);
});


test('pending rewards credit the server save once and rollback does not lose them', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE "PlayerProgress" ("vkId" INTEGER PRIMARY KEY, "state" JSONB NOT NULL, "revision" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await db.exec(await readFile('backend/prisma/migrations/20261107_shared_boss/migration.sql', 'utf8'));
    await db.exec(await readFile('backend/prisma/migrations/20261108_boss_keys/migration.sql', 'utf8'));
    await db.query('INSERT INTO "PlayerProgress" ("vkId", "state") VALUES ($1, $2::jsonb), ($3, $4::jsonb)', [101, JSON.stringify({ experience: 5, gold: 10, bullets: 20 }), 202, JSON.stringify({ experience: 1, gold: 2, bullets: 3 })]);
    const boss = await transaction(db, tx => joinCoopBoss(tx, config));
    await transaction(db, tx => takeCoopDamage(tx, boss.id, 101, 'a', 20));
    await transaction(db, tx => takeCoopDamage(tx, boss.id, 202, 'b', 80));
    await assert.rejects(transaction(db, async tx => { await claimCoopRewards(tx, 101); throw new Error('rollback'); }));
    const first = await transaction(db, tx => claimCoopRewards(tx, 101));
    assert.deepEqual(first.state, { experience: 56, gold: 36, bullets: 26, bossKeys: {} });
    assert.equal(first.revision, 1); assert.equal(first.claimed.length, 1);
    const again = await transaction(db, tx => claimCoopRewards(tx, 101));
    assert.equal(again.revision, 1); assert.equal(again.claimed.length, 0);
    assert.deepEqual(again.state, first.state);
    const second = await transaction(db, tx => claimCoopRewards(tx, 202));
    assert.deepEqual(second.state, { experience: 51, gold: 27, bullets: 8, bossKeys: {} });
  } finally { await db.close(); }
});

test('a migrated live encounter grants each attacker a next key exactly once, even after retreat', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE TABLE "PlayerProgress" ("vkId" INTEGER PRIMARY KEY, "state" JSONB NOT NULL, "revision" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    await db.exec(await readFile('backend/prisma/migrations/20261107_shared_boss/migration.sql', 'utf8'));
    await db.query('INSERT INTO "PlayerProgress" ("vkId", "state") VALUES (101, $1::jsonb), (202, $1::jsonb), (303, $1::jsonb)', [JSON.stringify({ experience: 0, gold: 0, bullets: 0, battle: null })]);
    await db.exec(`INSERT INTO "CoopBoss" ("id", "bossId", "maxHp", "hp", "status", "rewardXp", "rewardGold", "rewardBullets") VALUES ('live', 'zombie', 100, 100, 'alive', 10, 10, 10)`);
    await db.exec(await readFile('backend/prisma/migrations/20261108_boss_keys/migration.sql', 'utf8'));
    await transaction(db, tx => takeCoopDamage(tx, 'live', 101, 'first', 20));
    await transaction(db, tx => takeCoopDamage(tx, 'live', 202, 'final', 80));
    await assert.rejects(transaction(db, async tx => { await claimCoopRewards(tx, 101); throw new Error('rollback'); }));
    const first = await transaction(db, tx => claimCoopRewards(tx, 101));
    assert.equal(first.state.bossKeys.zombie_brute, 1);
    const repeat = await transaction(db, tx => claimCoopRewards(tx, 101));
    assert.equal(repeat.state.bossKeys.zombie_brute, 1); assert.equal(repeat.claimed.length, 0);
    const second = await transaction(db, tx => claimCoopRewards(tx, 202));
    assert.equal(second.state.bossKeys.zombie_brute, 1);
    const observer = await transaction(db, tx => claimCoopRewards(tx, 303));
    assert.equal(observer.claimed.length, 0); assert.equal(observer.state.bossKeys, undefined);
  } finally { await db.close(); }
});
