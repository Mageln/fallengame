import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());
const { createServerProgress } = await vite.ssrLoadModule('/src/game/serverProgress.ts');
const snapshot = (revision) => new Response(JSON.stringify({ state: { revision }, revision }), { status: 200 });

test('server commands run sequentially and use the preceding revision', async () => {
  const requests = [];
  const client = createServerProgress('', '?vk=example', async (url, init) => {
    requests.push({ url, init });
    if (init.method === 'GET') return snapshot(3);
    const payload = JSON.parse(init.body);
    return snapshot(payload.revision + 1);
  });
  await client.load();
  await Promise.all([client.act({ type: 'NEXT_TUTORIAL' }), client.act({ type: 'SKIP_TUTORIAL' })]);
  assert.deepEqual(requests.slice(1).map((r) => JSON.parse(r.init.body).revision), [3, 4]);
  assert.equal(requests[0].url, '/api/progress');
  assert.equal(requests[0].init.headers['X-VK-Launch-Params'], '?vk=example');
});

test('an uncertain write blocks queued writes until explicit reload', async () => {
  const requests = [];
  let fail = true;
  const client = createServerProgress('', '?signed', async (url, init) => {
    requests.push(init.method);
    if (init.method === 'GET') return snapshot(5);
    if (fail) throw new Error('disconnected');
    return snapshot(6);
  });
  await client.load();
  const first = client.act({ type: 'NEXT_TUTORIAL' });
  const queued = client.act({ type: 'SKIP_TUTORIAL' });
  await assert.rejects(first);
  await assert.rejects(queued);
  assert.deepEqual(requests, ['GET', 'POST']);
  fail = false;
  await client.load();
  await client.act({ type: 'SKIP_TUTORIAL' });
  assert.deepEqual(requests, ['GET', 'POST', 'GET', 'POST']);
});

test('a rejected unsupported action does not corrupt the revision', async () => {
  const client = createServerProgress('', '?signed', async (_url, init) => {
    if (init.method === 'GET') return snapshot(2);
    const { action, revision } = JSON.parse(init.body);
    return action.type === 'START_GAST' ? new Response('', { status: 400 }) : snapshot(revision + 1);
  });
  await client.load();
  await assert.rejects(client.act({ type: 'START_GAST' }), /недоступно/);
  assert.equal((await client.act({ type: 'NEXT_TUTORIAL' })).revision, 3);
});

test('client never forwards its combat clock to server', async () => {
  const actions = [];
  const client = createServerProgress('', '?signed', async (_url, init) => {
    if (init.method === 'GET') return snapshot(0);
    actions.push(JSON.parse(init.body).action);
    return snapshot(actions.length);
  });
  await client.load();
  await client.act({ type: 'BOSS_SKILL', skillId: 'jab', now: 9999999999 });
  await client.act({ type: 'BOSS_TICK', now: 9999999999 });
  await client.act({ type: 'BOSS_SKILL', skillId: 'heal', now: 9999999999 });
  assert.deepEqual(actions, [{ type: 'BOSS_SKILL', skillId: 'jab' }, { type: 'BOSS_TICK' }, { type: 'BOSS_SKILL', skillId: 'heal' }]);
});

test('skill upgrade sends only an action and accepts server-confirmed state', async () => {
  const requests = [];
  const client = createServerProgress('', '?signed', async (_url, init) => {
    if (init.method === 'GET') return new Response(JSON.stringify({ state: { bullets: 100, profileSkills: { heal: 0 } }, revision: 4 }));
    requests.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ state: { bullets: 50, profileSkills: { heal: 1 } }, revision: 5 }));
  });
  const initial = await client.load();
  const upgraded = await client.act({ type: 'UPGRADE_PROFILE_SKILL', skillId: 'heal' });
  assert.deepEqual(requests, [{ revision: 4, action: { type: 'UPGRADE_PROFILE_SKILL', skillId: 'heal' } }]);
  assert.equal(initial.bullets, 100);
  assert.equal(upgraded.bullets, 50);
  assert.equal(upgraded.profileSkills.heal, 1);
});
