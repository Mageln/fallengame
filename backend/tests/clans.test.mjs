import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { after, before, test } from 'node:test';
import express from 'express';
import { clanRouter } from '../dist/routes/clan.js';

let server;
let origin;
const previousSecret = process.env.VK_APP_SECRET;

before(async () => {
  process.env.VK_APP_SECRET = 'integration-test-secret';
  const app = express();
  app.use(express.json());
  app.use('/clans', clanRouter);
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  if (previousSecret === undefined) delete process.env.VK_APP_SECRET;
  else process.env.VK_APP_SECRET = previousSecret;
});

const launchHeader = () => {
  const params = new URLSearchParams({ vk_app_id: '1', vk_user_id: '75', vk_ts: String(Math.floor(Date.now() / 1000)) });
  params.sort();
  params.set('sign', createHmac('sha256', process.env.VK_APP_SECRET).update(params.toString()).digest('base64url'));
  return params.toString();
};

test('mutating clan routes require a signed VK identity', async () => {
  const response = await fetch(`${origin}/clans/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Дозор', emblem: 'skull' }) });
  assert.equal(response.status, 401);
});

test('creation validates name and emblem before touching database', async () => {
  const headers = { 'Content-Type': 'application/json', 'X-VK-Launch-Params': launchHeader() };
  const invalidName = await fetch(`${origin}/clans/create`, { method: 'POST', headers, body: JSON.stringify({ name: 'Ж', emblem: 'skull' }) });
  assert.equal(invalidName.status, 400);
  const invalidEmblem = await fetch(`${origin}/clans/create`, { method: 'POST', headers, body: JSON.stringify({ name: 'Дозор', emblem: 'unknown' }) });
  assert.equal(invalidEmblem.status, 400);
});

test('leaderboard rejects unsupported sort fields', async () => {
  const response = await fetch(`${origin}/clans/leaderboard?sort=members`);
  assert.equal(response.status, 400);
});

test('task progress rejects invalid events before connecting to database', async () => {
  const response = await fetch(`${origin}/clans/unknown/tasks/clear_streets/progress`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-VK-Launch-Params': launchHeader() },
    body: JSON.stringify({ amount: -1, eventId: 'test-event-1' }),
  });
  assert.equal(response.status, 400);
});
