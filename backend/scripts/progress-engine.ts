// Bundled for Node during backend build; the game rules have a single source.
export { createInitialState } from '../../src/game/initialState';
export { gameReducer, applyDailyReset } from '../../src/game/reducer';
export { ENERGY_TICK_MS } from '../../src/game/constants';
export { SKILL_DEFS } from '../../src/game/profileSkills';
export { BOSS_SKILLS } from '../../src/game/survival';

export { TUTORIAL_STEPS } from '../../src/game/tutorial';
