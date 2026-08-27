import { GameState } from './types';

const KEY = 'ergate-save-v1';

export const loadState = (): GameState | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
};

export const saveState = (state: GameState) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
};
