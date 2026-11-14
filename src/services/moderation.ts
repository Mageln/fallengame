import { BACKEND_URL } from '../config/vkConfig';
export type StaffRole = 'admin' | 'moderator' | 'player';
const api = `${BACKEND_URL.replace(/\/$/, '')}/api/moderation`;
export const moderationRequest = async (path: string, body?: unknown): Promise<unknown> => {
  const response = await fetch(`${api}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'X-VK-Launch-Params': window.location.search },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string' ? data.error : 'Ошибка сервера модерации.');
  return data;
};
export const getStaffRole = async (): Promise<StaffRole> => {
  const data = await moderationRequest('/me') as { role?: unknown };
  return data.role === 'admin' || data.role === 'moderator' ? data.role : 'player';
};
export const getStaffRoles = async (ids: number[]): Promise<Record<string, StaffRole>> => {
  const data = await moderationRequest('/roles', { ids: ids.slice(0, 100) }) as { roles?: Record<string, StaffRole> };
  return data.roles ?? {};
};
