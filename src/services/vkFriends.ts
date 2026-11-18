import type { VkUser } from './vkApi';

export interface VkFriendsPage {
  friends: VkUser[];
  nextOffset: number | null;
}

type VkApiCall = <T>(method: string, params: Record<string, string | number>) => Promise<T>;

// VK may return only part of the list. Offset advances by raw records, not by
// filtered records, so private/deleted profiles cannot cause repeated pages.
export async function fetchVkFriendsPage(callApi: VkApiCall, offset = 0): Promise<VkFriendsPage> {
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Некорректная страница друзей.');
  const result = await callApi<unknown>('friends.get', { fields: 'photo_200,online', count: 100, offset });
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('VK вернул некорректный список друзей.');
  const response = result as { count?: unknown; items?: unknown };
  if (!Array.isArray(response.items) || typeof response.count !== 'number' ||
      !Number.isSafeInteger(response.count) || response.count < 0) {
    throw new Error('VK вернул некорректный список друзей.');
  }
  const friends: VkUser[] = response.items.flatMap((value: unknown) => {
    if (!value || typeof value !== 'object') return [];
    const friend = value as Record<string, unknown>;
    if (typeof friend.id !== 'number' || !Number.isSafeInteger(friend.id) || friend.id < 1) return [];
    return [{
      id: friend.id,
      first_name: typeof friend.first_name === 'string' ? friend.first_name : 'Пользователь',
      last_name: typeof friend.last_name === 'string' ? friend.last_name : '',
      photo_200: typeof friend.photo_200 === 'string' ? friend.photo_200 : '',
      ...(friend.online === 0 || friend.online === 1 ? { online: friend.online } : {}),
    }];
  });
  const next = offset + response.items.length;
  return { friends, nextOffset: response.items.length > 0 && next < response.count ? next : null };
}
