/**
 * Конфигурация VK Mini Apps
 */

// ID вашего приложения из настроек VK Developers
export const VK_APP_ID = import.meta.env.VITE_VK_APP_ID || '0000000';

// Базовый URL вашего бэкенда (если есть серверная часть)
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

/**
 * Проверяет, запущено ли приложение в VK
 */
export function isVkEnvironment(): boolean {
  return typeof window !== 'undefined' && 
         window.location.hostname.includes('vk.com');
}

/**
 * Получает параметры запуска из URL (для VK Mini Apps)
 */
export function getLaunchParams(): Record<string, string> {
  const params: Record<string, string> = {};
  
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.forEach((value, key) => {
      params[key] = value;
    });
  }
  
  return params;
}

/**
 * Структура для хранения данных пользователя
 */
export interface VkLaunchData {
  hash: string;
  auth_key: string;
  user_id?: number;
  group_id?: number;
}

/**
 * Парсит параметры запуска VK Mini Apps
 */
export function parseVkLaunchParams(): VkLaunchData | null {
  const params = getLaunchParams();
  
  // VK передаёт hash и auth_key при запуске
  if (params.hash && params.auth_key) {
    return {
      hash: params.hash,
      auth_key: params.auth_key,
      user_id: params.user_id ? parseInt(params.user_id) : undefined,
      group_id: params.group_id ? parseInt(params.group_id) : undefined,
    };
  }
  
  return null;
}
