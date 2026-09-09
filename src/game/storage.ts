import { GameState } from './types';

const KEY_PREFIX = 'ergate-save-';

/**
 * Получает ключ localStorage для текущего пользователя
 */
export const getStorageKey = async (): Promise<string> => {
  try {
    const { getUser } = await import('@vkontakte/vk-bridge');
    const user = await getUser();
    return `${KEY_PREFIX}${user.id}`;
  } catch {
    // Если не в VK, используем дефолтный ключ
    return `${KEY_PREFIX}local`;
  }
};

export const loadState = async (): Promise<GameState | null> => {
  try {
    const key = await getStorageKey();
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const state = JSON.parse(raw) as GameState;
    return {
      ...state,
      showBossModal: false,
      showMap: false,
      showRaidModal: false,
      activeRaid: null,
    };
  } catch {
    return null;
  }
};

export const saveState = async (state: GameState) => {
  try {
    const key = await getStorageKey();
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
};
