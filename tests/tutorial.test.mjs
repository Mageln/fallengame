import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => vite.close());
const { createInitialState } = await vite.ssrLoadModule('/src/game/initialState.ts');
const { gameReducer, hydrateState } = await vite.ssrLoadModule('/src/game/reducer.ts');
const { TUTORIAL_STEPS, TUTORIAL_VERSION, tutorialIsActive } = await vite.ssrLoadModule('/src/game/tutorial.ts');
const { Tutorial } = await vite.ssrLoadModule('/src/panels/Tutorial.tsx');
const { carUpgradeCost } = await vite.ssrLoadModule('/src/game/formulas.ts');

const noop = () => {};
const props = { version: TUTORIAL_VERSION, step: 0, minimized: false, onStart: noop, onNext: noop, onSkip: noop, onMinimize: noop, onResume: noop, onDestination: noop };

test('fresh players start the story, legacy saves stay quiet and can start it explicitly', () => {
  const fresh = createInitialState();
  assert.ok(tutorialIsActive(fresh.tutorialVersion, fresh.tutorialStep));
  const { tutorialVersion, ...old } = fresh;
  assert.equal(tutorialVersion, TUTORIAL_VERSION);
  const loaded = hydrateState(old);
  assert.equal(loaded.tutorialVersion, undefined);
  assert.equal(tutorialIsActive(loaded.tutorialVersion, loaded.tutorialStep), false);
  assert.equal(gameReducer(loaded, { type: 'NEXT_TUTORIAL' }).tutorialStep, loaded.tutorialStep);
  const started = gameReducer(loaded, { type: 'START_TUTORIAL' });
  assert.equal(started.tutorialVersion, TUTORIAL_VERSION);
  assert.equal(started.tutorialStep, 0);
  assert.equal(started.bullets, loaded.bullets);
  assert.equal(started.experience, loaded.experience);
});

test('progress, skipping, reload and explicit replay do not award items or restart silently', () => {
  let state = createInitialState();
  const before = { bullets: state.bullets, gold: state.gold, energy: state.energy, experience: state.experience };
  state = gameReducer(state, { type: 'NEXT_TUTORIAL' });
  state = hydrateState(JSON.parse(JSON.stringify(state)));
  assert.equal(state.tutorialStep, 1);
  assert.ok(tutorialIsActive(state.tutorialVersion, state.tutorialStep));
  state = gameReducer(state, { type: 'SKIP_TUTORIAL' });
  state = hydrateState(JSON.parse(JSON.stringify(state)));
  assert.equal(tutorialIsActive(state.tutorialVersion, state.tutorialStep), false);
  assert.equal(gameReducer(state, { type: 'NEXT_TUTORIAL' }).tutorialStep, -1);
  for (const [key, value] of Object.entries(before)) assert.equal(state[key], value);
  state = gameReducer(state, { type: 'START_TUTORIAL' });
  for (let i = 0; i < TUTORIAL_STEPS.length; i++) state = gameReducer(state, { type: 'NEXT_TUTORIAL' });
  assert.equal(state.tutorialStep, -1);
  assert.equal(tutorialIsActive(state.tutorialVersion, state.tutorialStep), false);
});

test('the story and guidance render, preserve access to skip and map destinations', () => {
  const intro = renderToStaticMarkup(React.createElement(Tutorial, props));
  assert.match(intro, /Эргейт/);
  assert.match(intro, /ПРОПУСТИТЬ ОБУЧЕНИЕ/);
  assert.doesNotMatch(intro, /aria-modal/);
  assert.match(renderToStaticMarkup(React.createElement(Tutorial, { ...props, minimized: true })), /ПРОДОЛЖИТЬ ОБУЧЕНИЕ/);
  assert.match(renderToStaticMarkup(React.createElement(Tutorial, { ...props, version: undefined })), /ИСТОРИЯ И ОБУЧЕНИЕ/);
  assert.match(renderToStaticMarkup(React.createElement(Tutorial, { ...props, step: 6 })), /ЗАВЕРШИТЬ/);
  const destinations = TUTORIAL_STEPS.flatMap((step) => step.destination ? [step.destination] : []);
  assert.deepEqual(destinations, ['profile', 'tasks', 'profile', 'map', 'bosses', 'quests']);
});

test('car upgrade exposed by training consumes correct resources and updates daily quest', () => {
  let state = createInitialState();
  const cost = carUpgradeCost(state.carLevel);
  state = { ...state, energy: cost.energy, matches: cost.matches };
  const next = gameReducer(state, { type: 'UPGRADE_CAR' });
  assert.equal(next.carLevel, state.carLevel + 1);
  assert.equal(next.energy, 0);
  assert.equal(next.matches, 0);
  assert.equal(next.daily.quests.find((q) => q.questId === 'q4').completed, true);
});

test('guide buttons forward each destination and can minimize or resume', () => {
  const visited = [];
  const findButton = (node, label) => {
    if (!node || typeof node !== 'object') return undefined;
    if (node.type === 'button' && node.props.children === label) return node;
    for (const child of React.Children.toArray(node.props?.children)) {
      const found = findButton(child, label);
      if (found) return found;
    }
    return undefined;
  };
  for (let index = 0; index < TUTORIAL_STEPS.length; index++) {
    const step = TUTORIAL_STEPS[index];
    if (!step.destination) continue;
    const tree = Tutorial({ ...props, step: index, onDestination: (destination) => visited.push(destination) });
    const button = findButton(tree, step.button);
    assert.ok(button, step.button);
    button.props.onClick();
    assert.equal(visited.at(-1), step.destination);
  }
  let resumed = false;
  const collapsed = Tutorial({ ...props, minimized: true, onResume: () => { resumed = true; } });
  collapsed.props.onClick();
  assert.equal(resumed, true);
});
