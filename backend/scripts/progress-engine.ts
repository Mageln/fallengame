// Bundled for Node during backend build; the game rules have a single source.
export { createInitialState } from '../../src/game/initialState';
export { gameReducer, applyDailyReset } from '../../src/game/reducer';
export { ENERGY_TICK_MS } from '../../src/game/constants';
