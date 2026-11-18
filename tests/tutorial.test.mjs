import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFile } from 'node:fs/promises';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const { createInitialState } = await vite.ssrLoadModule('/src/game/initialState.ts');
const { gameReducer, hydrateState } = await vite.ssrLoadModule('/src/game/reducer.ts');
const { TUTORIAL_STEPS, TUTORIAL_VERSION, tutorialIsActive, tutorialViewStep } = await vite.ssrLoadModule('/src/game/tutorial.ts');
const { Tutorial } = await vite.ssrLoadModule('/src/panels/Tutorial.tsx');
const { TUTORIAL_TARGETS, canvasTargetRect, tutorialCarouselOffset } = await vite.ssrLoadModule('/src/components/FallenCanvas/tutorialTargets.ts');
const { carUpgradeCost } = await vite.ssrLoadModule('/src/game/formulas.ts');
const noop = () => {};
const props = { version: TUTORIAL_VERSION, step: 0, onLocate: noop, onPractice: noop, onSkip: noop };
const practice = (state, stepId) => gameReducer(state, { type: 'TUTORIAL_PRACTICE', stepId });

test('new players see training; legacy and already finished profiles do not restart', () => {
  const fresh = createInitialState();
  assert.ok(tutorialIsActive(fresh.tutorialVersion, fresh.tutorialStep));
  const { tutorialVersion, ...old } = fresh;
  assert.equal(tutorialVersion, TUTORIAL_VERSION);
  const loaded = hydrateState(old);
  assert.equal(tutorialIsActive(loaded.tutorialVersion, loaded.tutorialStep), false);
  assert.equal(gameReducer(loaded, { type: 'START_TUTORIAL' }).tutorialVersion, undefined);
  for (const version of [1, TUTORIAL_VERSION]) {
    let completed = { ...fresh, tutorialVersion: version, tutorialStep: -1 };
    completed = gameReducer(completed, { type: 'START_TUTORIAL' });
    assert.equal(completed.tutorialStep, -1);
    assert.equal(tutorialIsActive(completed.tutorialVersion, completed.tutorialStep), false);
  }
});

test('practice requires exactly the current action, never spends or grants real resources', () => {
  let state = createInitialState();
  const before = { bullets: state.bullets, gold: state.gold, energy: state.energy, matches: state.matches, experience: state.experience, carLevel: state.carLevel };
  const ids = TUTORIAL_STEPS.map((step) => step.id);
  assert.equal(new Set(ids).size, ids.length);
  for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
    assert.equal(practice(state, 'wrong-step').tutorialStep, i);
    assert.equal(gameReducer(state, { type: 'NEXT_TUTORIAL' }).tutorialStep, i);
    state = practice(state, TUTORIAL_STEPS[i].id);
    assert.equal(state.tutorialStep, i === TUTORIAL_STEPS.length - 1 ? -1 : i + 1);
    for (const [key, value] of Object.entries(before)) assert.equal(state[key], value);
    if (i < TUTORIAL_STEPS.length - 1) assert.equal(practice(state, TUTORIAL_STEPS[i].id).tutorialStep, i + 1);
  }
  state = hydrateState(JSON.parse(JSON.stringify(state)));
  assert.equal(tutorialIsActive(state.tutorialVersion, state.tutorialStep), false);
  assert.equal(gameReducer(state, { type: 'START_TUTORIAL' }).tutorialStep, -1);
  assert.equal(practice(state, 'intro').tutorialStep, -1);
});

test('skip is permanent and unfinished version one migrates safely on practice', () => {
  let state = practice(createInitialState(), 'intro');
  state = hydrateState(JSON.parse(JSON.stringify(state)));
  assert.equal(state.tutorialStep, 1);
  state = gameReducer(state, { type: 'SKIP_TUTORIAL' });
  assert.equal(tutorialIsActive(state.tutorialVersion, state.tutorialStep), false);
  assert.equal(gameReducer(state, { type: 'START_TUTORIAL' }).tutorialStep, -1);
  const old = { ...createInitialState(), tutorialVersion: 1, tutorialStep: 5 };
  assert.equal(tutorialViewStep(old.tutorialVersion, old.tutorialStep), 0);
  assert.equal(practice(old, 'raid-start').tutorialStep, 5);
  const upgraded = practice(old, 'intro');
  assert.equal(upgraded.tutorialVersion, TUTORIAL_VERSION);
  assert.equal(upgraded.tutorialStep, 1);
});

test('centered dialog exposes only the current exercise and disables other controls', async () => {
  for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
    const step = TUTORIAL_STEPS[i];
    const html = renderToStaticMarkup(React.createElement(Tutorial, { ...props, step: i }));
    assert.match(html, /role="dialog"/);
    assert.match(html, /aria-modal="true"/);
    if (TUTORIAL_TARGETS[step.id]) {
      assert.ok(html.includes(TUTORIAL_TARGETS[step.id].label));
      assert.match(html, /Нажмите на подсвеченное место/);
    } else {
      assert.ok(html.includes(step.button));
      assert.match(html, /НЕ ВЛИЯЕТ НА ИГРУ/);
      assert.equal((html.match(/ disabled=""/g) ?? []).length, step.disabled?.length ?? 0);
    }
    assert.match(html, /ПРОПУСТИТЬ ТРЕНИРОВКУ/);
  }
  assert.equal(renderToStaticMarkup(React.createElement(Tutorial, { ...props, step: -1 })), '');
  const css = await readFile('src/style/Tutorial.module.scss', 'utf8');
  assert.match(css, /place-items:\s*center/);
  const home = await readFile('src/panels/Home.tsx', 'utf8');
  assert.match(home, /gameLayer\.current\.inert = tutorialActive/);
  assert.match(home, /aria-hidden=\{tutorialActive \|\| undefined\}/);
});

test('car upgrade remains available and spends its normal resources', () => {
  let state = createInitialState();
  const cost = carUpgradeCost(state.carLevel);
  state = { ...state, energy: cost.energy, matches: cost.matches };
  const next = gameReducer(state, { type: 'UPGRADE_CAR' });
  assert.equal(next.carLevel, state.carLevel + 1);
  assert.equal(next.energy, 0);
  assert.equal(next.matches, 0);
});

test('training combat costs match the live rules and arena attempts', async () => {
  const { BOSS_ENERGY_PER_HIT, BOSS_SKILLS } = await vite.ssrLoadModule('/src/game/survival.ts');
  const { ARENA_DAILY_LIMIT } = await vite.ssrLoadModule('/src/game/arena.ts');
  const step = (id) => TUTORIAL_STEPS.find((item) => item.id === id);
  assert.equal(BOSS_ENERGY_PER_HIT, 20);
  assert.equal(BOSS_SKILLS.find((skill) => skill.id === 'weapon').energyCost, 10);
  assert.equal(BOSS_SKILLS.find((skill) => skill.id === 'block').energyCost, 20);
  assert.equal(BOSS_SKILLS.find((skill) => skill.id === 'heal').energyCost, 50);
  assert.equal(ARENA_DAILY_LIMIT, 5);
  assert.match(step('fist').button, /\+20/);
  assert.match(step('weapon').button, /−10/);
  assert.match(step('block').button, /−20/);
  assert.match(step('heal').button, /−50/);
  assert.match(step('arena').instruction, /5 нападений/);
});


test('guide translates real canvas hitboxes and reveals carousel items', () => {
  const canvas = { getBoundingClientRect: () => ({ left: 15, top: 30, width: 320, height: 600 }),
    tutorialButtons: [{ id: 'go_profile', x: 5, y: 8, width: 70, height: 40 }] };
  assert.deepEqual(canvasTargetRect(canvas, 'go_profile'), { left: 20, top: 38, width: 70, height: 40 });
  assert.equal(canvasTargetRect(canvas, 'missing'), null);
  assert.equal(tutorialCarouselOffset('go_cloth'), 2);
  assert.equal(tutorialCarouselOffset('go_komnata'), 3);
  assert.equal(tutorialCarouselOffset('go_boss'), 0);
});

test('training battle renders the real combat controls without touching player state', async () => {
  const { GameContext } = await vite.ssrLoadModule('/src/game/GameContext.tsx');
  const { TutorialBattlePreview } = await vite.ssrLoadModule('/src/panels/TutorialBattlePreview.tsx');
  const state = createInitialState();
  const before = JSON.stringify(state);
  let calls = 0;
  const value = { state, dispatch: () => calls++, derived: {}, vkUser: null, isLoading: false, serverMode: false };
  for (const id of ['fist', 'weapon', 'block', 'heal', 'rage']) {
    const html = renderToStaticMarkup(React.createElement(GameContext.Provider, { value }, React.createElement(TutorialBattlePreview, { stepId: id })));
    assert.match(html, /data-tutorial-target="boss-skill-jab"/);
    assert.match(html, /data-tutorial-target="boss-skill-heal"/);
    if (id === 'rage') assert.match(html, /фаза ярости/);
  }
  assert.equal(JSON.stringify(state), before);
  assert.equal(calls, 0);
});
