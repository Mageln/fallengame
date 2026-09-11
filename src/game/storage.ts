import { GameState } from './types';

const KEY_PREFIX = 'ergate-save-';

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
