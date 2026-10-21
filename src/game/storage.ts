import { ClanState, GameState } from './types';

const KEY_PREFIX = 'ergate-save-';
const CLANS_KEY = 'ergate-clans-v1';

// Текущий идентификатор пользователя (VK ID или 'local' в режиме разработки)
// Устанавливается через setCurrentUserId() после получения данных из VK
let currentUserId: string | number | null = null;

/**
 * Устанавливает текущего пользователя — от этого зависит, в какой ключ
 * localStorage сохраняются ресурсы (у каждого пользователя свои ресурсы)
 */
export const setCurrentUserId = (userId: string | number | null): void => {
  currentUserId = userId;
};

/**
 * Возвращает ключ localStorage для текущего пользователя
 */
export const getStorageKey = (): string => {
  return `${KEY_PREFIX}${currentUserId ?? 'local'}`;
};

/**
 * Синхронно загружает сохранение текущего пользователя
 */
export const loadStateSync = (): GameState | null => {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
};

export const loadState = async (): Promise<GameState | null> => {
  return loadStateSync();
};

export const saveState = (state: GameState) => {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
};

// Общая доска на этом устройстве; для межустройственного рейтинга нужен сервер.
export const loadClanDirectory = (): ClanState[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(CLANS_KEY) ?? '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

export const saveClanDirectory = (clans: ClanState[]): void => {
  try {
    const serialized = JSON.stringify(clans);
    if (localStorage.getItem(CLANS_KEY) !== serialized) localStorage.setItem(CLANS_KEY, serialized);
  } catch {
    /* ignore quota */
  }
};

export const clanDirectoryKey = CLANS_KEY;
