import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';
const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());
const { fetchVkFriendsPage } = await vite.ssrLoadModule('/src/services/vkFriends.ts');

test('loads all available friends in pages and keeps online status', async () => {
  const calls = [];
  const call = async (method, params) => {
    calls.push({ method, params });
    return params.offset === 0
      ? { count: 3, items: [{ id: 1, first_name: 'Анна', photo_200: 'a.jpg', online: 1 }, { id: 2, first_name: 'Иван', online: 0 }] }
      : { count: 3, items: [{ id: 3, first_name: 'Ольга' }] };
  };
  const first = await fetchVkFriendsPage(call);
  assert.equal(first.nextOffset, 2);
  assert.equal(first.friends[0].online, 1);
  assert.equal(first.friends[1].online, 0);
  const second = await fetchVkFriendsPage(call, first.nextOffset);
  assert.equal(second.friends[0].id, 3);
  assert.equal(second.nextOffset, null);
  assert.equal(calls[0].method, 'friends.get');
  assert.equal(calls[1].params.offset, 2);
});

test('friend list propagates API failures and rejects malformed responses', async () => {
  await assert.rejects(fetchVkFriendsPage(async () => { throw new Error('Нет доступа'); }), /Нет доступа/);
  await assert.rejects(fetchVkFriendsPage(async () => ({ items: [], count: '3' })), /некорректный/);
  await assert.rejects(fetchVkFriendsPage(async () => ({}), -1), /Некорректная/);
  const empty = await fetchVkFriendsPage(async () => ({ items: [], count: 100 }));
  assert.equal(empty.nextOffset, null);
});
