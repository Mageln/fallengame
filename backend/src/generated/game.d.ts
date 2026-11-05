export function createInitialState(): Record<string, unknown>;
export function gameReducer(state: Record<string, unknown>, action: Record<string, unknown>): Record<string, unknown>;
export function applyDailyReset(state: Record<string, unknown>): Record<string, unknown>;
export const ENERGY_TICK_MS: number;
