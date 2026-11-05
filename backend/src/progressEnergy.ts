import { ENERGY_TICK_MS } from './generated/game.js';

// The anchor is stored server-side, never accepted from a request. Time at the cap
// cannot be banked and spent immediately after spending energy.
export const restoreEnergy = (state: Record<string, unknown>, anchor: Date, now: Date) => {
  const energy = Number(state.energy);
  const max = Number(state.maxEnergy);
  const interval = state.shelterGenerator ? ENERGY_TICK_MS / 2 : ENERGY_TICK_MS;
  const current = now.getTime();
  const start = Math.min(anchor.getTime(), current);
  if (energy >= max) return { state, anchor: new Date(current) };
  const ticks = Math.floor((current - start) / interval);
  if (ticks <= 0) return { state, anchor: new Date(start) };
  const nextEnergy = Math.min(max, energy + ticks);
  return {
    state: { ...state, energy: nextEnergy },
    anchor: new Date(nextEnergy >= max ? current : start + ticks * interval),
  };
};
