import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());
const { hasVkLaunchParams, shouldUseMockVkData } = await vite.ssrLoadModule('/src/services/vkEnvironment.ts');

test('VK launch is detected by launch parameters rather than host name', () => {
  const launch = '?vk_app_id=42&vk_platform=desktop_web&vk_user_id=123&sign=signed';
  assert.equal(hasVkLaunchParams(launch), true);
  assert.equal(shouldUseMockVkData(true, launch), false);
  assert.equal(shouldUseMockVkData(true, ''), true);
  assert.equal(shouldUseMockVkData(false, ''), false);
  assert.equal(hasVkLaunchParams('?vk_app_id=42&vk_platform=desktop_web&vk_user_id=123'), false);
});

test('a VK launch on an external app host loads the real user and never falls back to a mock on failure', async () => {
  const bridge = (await import('@vkontakte/vk-bridge')).default;
  const oldWindow = globalThis.window;
  const originalSend = bridge.send;
  const originalSupports = bridge.supports;
  const originalIsWebView = bridge.isWebView;
  try {
    globalThis.window = { location: { hostname: 'game.example', search: '?vk_app_id=42&vk_platform=desktop_web&vk_user_id=123&sign=example' } };
    bridge.supports = () => true;
    bridge.isWebView = () => false;
    bridge.send = async () => ({ id: 123, first_name: 'Настоящее', last_name: 'Имя', photo_200: 'https://example.org/avatar.jpg' });
    const { getVkUser } = await vite.ssrLoadModule('/src/services/vkApi.ts');
    assert.deepEqual(await getVkUser(), { id: 123, first_name: 'Настоящее', last_name: 'Имя', photo_200: 'https://example.org/avatar.jpg' });
    bridge.send = async () => { throw new Error('unavailable'); };
    assert.equal(await getVkUser(), null);
  } finally {
    bridge.send = originalSend;
    bridge.supports = originalSupports;
    bridge.isWebView = originalIsWebView;
    if (oldWindow === undefined) delete globalThis.window;
    else globalThis.window = oldWindow;
  }
});
