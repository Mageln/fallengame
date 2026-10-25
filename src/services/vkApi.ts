import bridge from '@vkontakte/vk-bridge';
import { VK_APP_ID } from '../config/vkConfig';

export interface VkUser {
  id: number;
  first_name: string;
  last_name: string;
  photo_200: string;
  online?: number;
  level?: number | null;
  // Дополнительные поля для тестирования
  friends?: VkUser[];
  clan?: {
    id: number;
    name: string;
    members: number;
    icon: string;
  };
}

// Моковые данные для тестирования (режим разработки)
const MOCK_USER: VkUser = {
  id: 123456789,
  first_name: 'Александр',
  last_name: 'Иванов',
  photo_200: 'https://sun9-66.userapi.com/impg/c857432/v857432563/1e70a/XqZvVqZqZqQ.jpg',
  friends: [
    {
      id: 987654321,
      first_name: 'Мария',
      last_name: 'Петрова',
      photo_200: 'https://sun9-66.userapi.com/impg/c857432/v857432563/1e70b/YqZwWrZrZrR.jpg',
    },
    {
      id: 111222333,
      first_name: 'Дмитрий',
      last_name: 'Сидоров',
      photo_200: 'https://sun9-66.userapi.com/impg/c857432/v857432563/1e70c/ZrZxXsZsZsS.jpg',
    },
    {
      id: 444555666,
      first_name: 'Елена',
      last_name: 'Козлова',
      photo_200: 'https://sun9-66.userapi.com/impg/c857432/v857432563/1e70d/asZyYtZtZtT.jpg',
    },
  ],
  clan: {
    id: 789012345,
    name: 'Зомби Истребители',
    members: 47,
    icon: '🎯',
  },
};

// Разово вычищаем остатки старого небезопасного хранения токена.
// Токены нельзя держать в localStorage: их крадёт любой XSS.
try {
  localStorage.removeItem('vk_token');
} catch {
  /* ignore — приватный режим и т.п. */
}

/**
 * Проверяет режим разработки (не в VK)
 */
function isDevMode(): boolean {
  // Если URL не содержит vk.com — режим разработки
  if (typeof window !== 'undefined') {
    return !window.location.hostname.includes('vk.com');
  }
  return true;
}

// Токен пользователя живёт только в памяти (не в localStorage)
// и действует ~1 час — Bridge выдаст новый, когда срок выйдет.
let cachedToken: string | null = null;
let cachedTokenExpiresAt = 0;

function getNumericAppId(): number | null {
  const id = Number.parseInt(VK_APP_ID, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * Получает пользовательский токен через VK Bridge (VKWebAppGetAuthToken).
 * Возвращает null вне VK, без app_id или при отказе пользователя.
 */
async function getUserAuthToken(scope = 'friends', forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && cachedToken && Date.now() < cachedTokenExpiresAt) return cachedToken;
  if (isDevMode()) return null;
  const appId = getNumericAppId();
  if (appId === null) {
    console.warn('⚠️ VITE_VK_APP_ID не задан — запросы к VK API недоступны');
    return null;
  }
  if (!bridge.supports('VKWebAppGetAuthToken')) return null;
  try {
    const result = await bridge.send('VKWebAppGetAuthToken', { app_id: appId, scope });
    cachedToken = result.access_token || null;
    // Поле expires — либо секунды жизни токена (~3600), либо unix-timestamp.
    // Без запаса не кэшируем дольше 55 минут, чтобы не упереться в протухший токен.
    const expires = result.expires ?? 3300;
    if (expires > 1e12) cachedTokenExpiresAt = expires;
    else if (expires > 1e9) cachedTokenExpiresAt = expires * 1000;
    else if (expires > 0) cachedTokenExpiresAt = Date.now() + expires * 1000;
    else cachedTokenExpiresAt = Date.now() + 55 * 60 * 1000;
    cachedTokenExpiresAt -= 5 * 60 * 1000; // запас 5 минут
    return cachedToken;
  } catch {
    return null;
  }
}

function isAuthFailure(error: any): boolean {
  if (error?.error_type === 'auth_error') return true;
  const data = error?.error_data ?? {};
  // 5 — ошибка авторизации, 1116 — истёкший токен
  return data?.error_code === 5 || data?.error_code === 1116;
}

/**
 * Вызов VK API через Bridge (VKWebAppCallAPIMethod).
 * Подпись и токен подставляет платформа — ключи в клиентском коде не нужны.
 * При протухшем токене один раз обновляет его и повторяет запрос.
 */
async function callVkApi<T>(method: string, params: Record<string, string | number>): Promise<T> {
  const token = await getUserAuthToken();
  if (!token) {
    throw new Error('Нет доступа к VK API: запустите приложение внутри VK и разрешите доступ к друзьям.');
  }
  try {
    const response = await bridge.send('VKWebAppCallAPIMethod', {
      method,
      params: { ...params, v: '5.131', access_token: token },
    });
    return (response as { response: T }).response;
  } catch (error) {
    if (!isAuthFailure(error)) throw error;
    // Токен протух — берём свежий и пробуем ещё раз
    cachedToken = null;
    const freshToken = await getUserAuthToken('friends', true);
    if (!freshToken) throw error;
    const response = await bridge.send('VKWebAppCallAPIMethod', {
      method,
      params: { ...params, v: '5.131', access_token: freshToken },
    });
    return (response as { response: T }).response;
  }
}

/**
 * Извлекает понятное описание ошибки из ответа VK Bridge
 * (см. документацию: error_type = client_error | api_error | auth_error)
 */
function describeBridgeError(error: any): string {
  const data = error?.error_data ?? error;
  const type = error?.error_type;

  if (type === 'client_error') {
    return `client_error ${data?.error_code}: ${data?.error_reason} ${data?.error_description ?? ''}`;
  }
  if (type === 'api_error') {
    return `api_error ${data?.error_code}: ${data?.error_msg}`;
  }
  if (type === 'auth_error') {
    return `auth_error ${data?.error}: ${data?.error_reason}`;
  }
  return String(error);
}

/**
 * Получает данные текущего пользователя VK
 */
export async function getVkUser(): Promise<VkUser | null> {
  try {
    // Если не в VK — используем моковые данные для тестирования
    if (isDevMode()) {
      console.log('🔧 Режим разработки — используются моковые данные');
      return MOCK_USER;
    }

    // В реальном VK получаем данные через Bridge
    // Проверяем, что платформа поддерживает метод
    if (!bridge.supports('VKWebAppGetUserInfo')) {
      console.warn('⚠️ VKWebAppGetUserInfo не поддерживается на этой платформе');
      return MOCK_USER;
    }

    const result = await bridge.send('VKWebAppGetUserInfo', {});

    if (result && typeof result === 'object') {
      const userData = result as any;
      return {
        id: userData.id ?? userData.user_id,
        first_name: userData.first_name,
        last_name: userData.last_name || '',
        photo_200: userData.photo_200 || '',
      };
    }

    return null;
  } catch (error) {
    console.error('Ошибка получения данных VK пользователя:', describeBridgeError(error));
    // При ошибке возвращаем моковые данные
    console.log('⚠️ Ошибка VK Bridge — используются моковые данные');
    return MOCK_USER;
  }
}

/**
 * Получает список друзей пользователя
 */
// Только пользователи, для которых VK подтвердил установку приложения.
// Обычный friends.get и моковые друзья не считаются игроками.
export async function getPlayingFriends(): Promise<VkUser[]> {
  if (isDevMode()) return [];
  const ids = await callVkApi<number[]>('friends.getAppUsers', {});
  const validIds = Array.isArray(ids) ? ids.filter((id): id is number => Number.isInteger(id)) : [];
  if (!validIds.length) return [];
  const users = await callVkApi<VkUser[]>('users.get', {
    user_ids: validIds.slice(0, 100).join(','),
    fields: 'photo_200,online',
  });
  return (users ?? []).map((friend) => ({ ...friend, level: null }));
}

export async function inviteVkFriends(): Promise<void> {
  if (!bridge.supports('VKWebAppShowInviteBox')) throw new Error('Приглашения недоступны вне приложения VK.');
  await bridge.send('VKWebAppShowInviteBox');
}

export async function getVkFriends(): Promise<VkUser[]> {
  try {
    // В режиме разработки возвращаем моковых друзей
    if (isDevMode()) {
      return MOCK_USER.friends || [];
    }

    const users = await callVkApi<any[]>('friends.get', {
      fields: 'photo_200',
      count: 20,
    });
    const items = Array.isArray(users) ? users : (users as any)?.items ?? [];
    return items.map((friend: any) => ({
      id: friend.id,
      first_name: friend.first_name,
      last_name: friend.last_name || '',
      photo_200: friend.photo_200 || '',
    }));
  } catch (error) {
    console.error('Ошибка получения друзей:', error);
    return [];
  }
}

/**
 * Проверяет, запущено ли приложение в VK
 */
export async function isVkMiniApp(): Promise<boolean> {
  try {
    if (isDevMode()) {
      return false;
    }
    return bridge.isWebView();
  } catch {
    return false;
  }
}

/**
 * Получает VK ID пользователя
 */
export async function getVkUserId(): Promise<number | null> {
  try {
    if (isDevMode()) {
      return MOCK_USER.id;
    }

    const result = await bridge.send('VKWebAppGetUserInfo', {});
    if (result && typeof result === 'object') {
      const data = result as any;
      return data.id ?? data.user_id ?? null;
    }
    return null;
  } catch {
    return isDevMode() ? MOCK_USER.id : null;
  }
}

/**
 * Получает информацию о клане пользователя
 */
export async function getVkClan(): Promise<VkUser['clan'] | null> {
  try {
    // В реальном VK можно получить клан через API
    // Для тестирования возвращаем моковые данные
    return MOCK_USER.clan || null;
  } catch (error) {
    console.error('Ошибка получения клана:', error);
    return MOCK_USER.clan || null;
  }
}
