import type { GameAction, GameState } from './types';

type Snapshot = { state: GameState; revision: number };
type Fetcher = typeof fetch;

export class ProgressError extends Error {
  constructor(message: string, public readonly status = 0) { super(message); }
}

// Requests are serialized. After an uncertain write or conflict, no queued write
// is sent until the user explicitly reloads the authoritative server snapshot.
export const createServerProgress = (baseUrl: string, launchParams: string, request: Fetcher = fetch) => {
  const url = `${baseUrl.replace(/\/$/, '')}/api/progress`;
  let revision: number | null = null;
  let paused = true;
  let queue: Promise<void> = Promise.resolve();
  const read = async (path: string, init: RequestInit): Promise<Snapshot> => {
    let response: Response;
    try {
      response = await request(`${url}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', 'X-VK-Launch-Params': launchParams },
      });
    } catch {
      throw new ProgressError('Нет связи с сервером. Результат последнего действия неизвестен; обновите состояние.');
    }
    if (!response.ok) {
      if (response.status === 400) throw new ProgressError('Это действие пока недоступно в серверном режиме.', 400);
      if (response.status === 409) throw new ProgressError('Прогресс изменился на другом устройстве. Обновите состояние.', 409);
      if (response.status === 401 || response.status === 503) throw new ProgressError('Не удалось авторизоваться в VK или сервер не настроен.', response.status);
      throw new ProgressError('Ошибка сервера. Обновите состояние перед продолжением.', response.status);
    }
    let snapshot: Snapshot;
    try { snapshot = await response.json() as Snapshot; }
    catch { throw new ProgressError('Некорректный ответ сервера. Обновите состояние.'); }
    if (!snapshot || !snapshot.state || typeof snapshot.state !== 'object' ||
        !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0) {
      throw new ProgressError('Некорректное состояние сервера. Обновите страницу.');
    }
    return snapshot;
  };
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const result = queue.then(fn);
    queue = result.then(() => undefined, () => undefined);
    return result;
  };
  return {
    load: () => serial(async () => {
      paused = true;
      const snapshot = await read('', { method: 'GET' });
      revision = snapshot.revision;
      paused = false;
      return snapshot.state;
    }),
    act: (action: GameAction) => serial(async () => {
      if (paused || revision === null) throw new ProgressError('Сначала обновите серверное состояние.');
      try {
        const snapshot = await read('/action', { method: 'POST', body: JSON.stringify({ revision, action }) });
        revision = snapshot.revision;
        return snapshot.state;
      } catch (error) {
        if (!(error instanceof ProgressError) || error.status !== 400) paused = true;
        throw error;
      }
    }),
  };
};
