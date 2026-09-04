import { GameState } from './types';

const KEY = 'ergate-save-v1';

export const loadState = (): GameState | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;
    // Всегда сбрасываем модальные окна при загрузке
    return {
      ...state,
      showBossModal: false,
    };
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
