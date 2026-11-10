export function createInitialState(): Record<string, unknown>;
export function gameReducer(state: Record<string, unknown>, action: Record<string, unknown>): Record<string, unknown>;
export function applyDailyReset(state: Record<string, unknown>): Record<string, unknown>;
export const ENERGY_TICK_MS: number;
export const SKILL_DEFS: ReadonlyArray<{ id: string }>;
export const BOSS_SKILLS: ReadonlyArray<{ id: string }>;
export const TUTORIAL_STEPS: ReadonlyArray<{ id: string }>;
export const BOSSES: ReadonlyArray<{ id: string; hp: number; reward: { gold: number; bullets: number } }>;
export function bossExperience(hp: number): number;
