import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => vite.close());
const { drawUI, BOSS_VISIBLE } = await vite.ssrLoadModule('/src/components/FallenCanvas/drawUI.ts');
const { createInitialState } = await vite.ssrLoadModule('/src/game/initialState.ts');
const { gameReducer } = await vite.ssrLoadModule('/src/game/reducer.ts');

// Canvas drawing is exercised with a minimal context; the important contract
// here is that extracted overlays still expose the same clickable regions.
const context = () => new Proxy({}, {
  get(target, key) {
    if (key in target) return target[key];
    if (key === 'measureText') return (text) => ({ width: String(text).length * 7 });
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
    return () => {};
  },
  set(target, key, value) { target[key] = value; return true; },
});
const data = { energy: 50, maxEnergy: 100, authority: 100, spicki: 0, bullets: 0, gold: 0,
  premiumGold: 0, zhetons: 0, level: 1, carLevel: 1, districtName: 'Район' };
const boss = { id: '1', name: 'Босс', subtitle: 'Враг', description: 'Описание', requirements: 'Нет', color: '#a00', level: 1,
  isSpecial: false, attackReward: { gold: 0, bullets: 0, zones: 0 }, soloReward: { gold: 0, bullets: 0, tokens: 0 } };
const draw = (flags, raids = [], bosses = []) => drawUI(context(), 1000, 700, data, null, flags, {}, 0, -1, -1, bosses, null, '#fff', raids);

test('map overlay retains raid and back hit targets', () => {
  const previous = globalThis.HTMLImageElement;
  globalThis.HTMLImageElement = class {};
  try {
    const buttons = draw({ showMap: true }, [{ id: 'test', name: 'Рейд', x: 50, y: 50, type: 'yellow', isRunning: false, completed: false }]);
    assert.ok(buttons.some((button) => button.id === 'raid_test'));
    assert.ok(buttons.some((button) => button.id === 'back_to_main'));
  } finally {
    if (previous === undefined) delete globalThis.HTMLImageElement;
    else globalThis.HTMLImageElement = previous;
  }
});

test('boss overlay keeps its cards, controls, and exported visible count', () => {
  const buttons = draw({ showBossModal: true }, [], [boss]);
  assert.equal(BOSS_VISIBLE, 2);
  assert.ok(buttons.some((button) => button.id === 'boss_fight_1'));
  assert.ok(buttons.some((button) => button.id === 'close_boss_modal'));
});

test('legacy district battle still renders its combat controls', () => {
  const state = gameReducer(createInitialState(), { type: 'START_BOSS', districtId: 'southgate' });
  assert.ok(state.battle);
  const buttons = draw({ battle: state.battle, battleResources: { medkits: 1, grenades: 1 } });
  for (const id of ['fight_attack', 'fight_block', 'fight_heal', 'fight_leave']) {
    assert.ok(buttons.some((button) => button.id === id), id);
  }
});

test('top bar draws the six resource images, including distinct supplies and premium', () => {
  const previous = globalThis.HTMLImageElement;
  globalThis.HTMLImageElement = class { complete = true; naturalWidth = 176; naturalHeight = 176; };
  try {
    const icons = Object.fromEntries(['energy', 'premium', 'gold', 'bullets', 'spicki', 'zhetons'].map((name) => [name, new globalThis.HTMLImageElement()]));
    const images = [];
    const text = [];
    const ctx = context();
    ctx.drawImage = (image) => images.push(image);
    ctx.fillText = (value) => text.push(value);
    const buttons = drawUI(ctx, 1000, 700, data, null, {}, icons, 0, -1, -1);
    for (const [name, image] of Object.entries(icons)) assert.ok(images.includes(image), `${name} icon is drawn`);
    assert.ok(!text.some((value) => ['🎟️', '🪵', '🔫', '💰', '🪙', '⚡'].includes(value)));
    assert.ok(buttons.some((button) => button.id === 'open_donation_shop'));
  } finally {
    if (previous === undefined) delete globalThis.HTMLImageElement;
    else globalThis.HTMLImageElement = previous;
  }
});
