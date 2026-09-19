import bridge from '@vkontakte/vk-bridge';

export interface VkUser {
  id: number;
  first_name: string;
  last_name: string;
  photo_200: string;
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

/**
 * Получает сохранённый токен из localStorage
 */
function getSavedToken(): string {
  return localStorage.getItem('vk_token') || '';
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

/**
 * Запрос к VK API через JSONP (обход CORS — VK API не отдаёт
 * заголовок Access-Control-Allow-Origin для прямых fetch-запросов)
 */
export function vkApiJsonp(method: string, params: Record<string, string>): Promise<any> {
  return new Promise((resolve, reject) => {
    const callbackName = `vkJsonpCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('VK API timeout'));
    }, 10000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      delete (window as any)[callbackName];
      script.remove();
    };

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      resolve(data);
    };

    const query = new URLSearchParams({ ...params, callback: callbackName });
    script.src = `https://api.vk.com/method/${method}?${query.toString()}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('VK API network error'));
    };
    document.body.appendChild(script);
  });
}

/**
 * Запрашивает данные пользователя через VK API с использованием токена (JSONP)
 */
async function fetchVkUserWithToken(token: string): Promise<VkUser | null> {
  try {
    const data = await vkApiJsonp('users.get', {
      user_ids: 'self',
      access_token: token,
      v: '5.131',
      fields: 'photo_200',
    });

    // Обработка ошибки API (например, невалидный токен)
    if (data.error) {
      console.error('VK API error:', data.error.error_code, data.error.error_msg);
      return null;
    }

    if (data.response && data.response.length > 0) {
      const user = data.response[0];
      return {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name || '',
        photo_200: user.photo_200 || '',
      };
    }

    return null;
  } catch (error) {
    console.error('Ошибка запроса к VK API:', error);
    return null;
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
    // Сначала проверяем кастомный токен
    const customToken = getSavedToken();
    if (customToken) {
      console.log('🔑 Используем кастомный токен VK');
      const user = await fetchVkUserWithToken(customToken);
      if (user) {
        return user;
      }
      console.log('⚠️ Кастомный токен невалиден');
    }
    
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
        id: userData.user_id,
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
export async function getVkFriends(): Promise<VkUser[]> {
  try {
    const customToken = getSavedToken();
    
    // Если есть кастомный токен, запрашиваем реальных друзей
    if (customToken) {
      try {
        const data = await vkApiJsonp('friends.get', {
          access_token: customToken,
          v: '5.131',
          fields: 'photo_200',
          count: '20',
        });

        if (data.error) {
          console.error('VK API error (friends):', data.error.error_code, data.error.error_msg);
        } else if (data.response && data.response.items) {
          return data.response.items.map((friend: any) => ({
            id: friend.id,
            first_name: friend.first_name,
            last_name: friend.last_name || '',
            photo_200: friend.photo_200 || '',
          }));
        }
      } catch (error) {
        console.log('Не удалось получить друзей через API');
      }
    }
    
    // В режиме разработки возвращаем моковых друзей
    if (isDevMode()) {
      return MOCK_USER.friends || [];
    }
    
    // В реальном VK можно получить друзей через API
    // Для тестирования возвращаем моковые данные
    return MOCK_USER.friends || [];
  } catch (error) {
    console.error('Ошибка получения друзей:', error);
    return MOCK_USER.friends || [];
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
    const customToken = getSavedToken();
    
    // Если есть кастомный токен
    if (customToken) {
      const user = await fetchVkUserWithToken(customToken);
      return user?.id || null;
    }
    
    if (isDevMode()) {
      return MOCK_USER.id;
    }
    
    const result = await bridge.send('VKWebAppGetUserInfo', {});
    if (result && typeof result === 'object') {
      return (result as any).user_id || null;
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
