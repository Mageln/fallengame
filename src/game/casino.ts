import type { GameAction, GameState } from './types';
import { todayUtc } from './survival';

export const CASINO_BET = 5;
export const CASINO_PRIZES = [
  { id: 'radio', name: 'Сигнал удачи', icon: '📻', cost: 15 },
  { id: 'crown', name: 'Король джекпота', icon: '👑', cost: 30 },
] as const;
export interface CasinoState {
  chips: number;
  points: number;
  lastSafeDate: string | null;
  owned: string[];
  equipped: string | null;
  result: string;
  reels: string[];
  plays: number;
}
export const emptyCasino = (): CasinoState => ({ chips: 0, points: 0, lastSafeDate: null, owned: [], equipped: null, result: '', reels: [], plays: 0 });
export const normalizeCasino = (value?: Partial<CasinoState> | null): CasinoState => {
  const number = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : 0;
  const owned: string[] = Array.isArray(value?.owned) ? CASINO_PRIZES.filter(p => value.owned!.includes(p.id)).map(p => p.id) : [];
  return { chips: number(value?.chips), points: number(value?.points),
    lastSafeDate: typeof value?.lastSafeDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.lastSafeDate) ? value.lastSafeDate : null,
    owned, equipped: typeof value?.equipped === 'string' && owned.includes(value.equipped) ? value.equipped : null,
    result: typeof value?.result === 'string' ? value.result.slice(0, 300) : '',
    reels: Array.isArray(value?.reels) ? value.reels.filter((v): v is string => typeof v === 'string').slice(0, 3) : [],
    plays: number(value?.plays) };
};
export const casinoBadge = (value?: Partial<CasinoState> | null) => CASINO_PRIZES.find(p => p.id === normalizeCasino(value).equipped);

type CasinoAction = Extract<GameAction, { type: 'CASINO_SAFE' | 'CASINO_SLOTS' | 'CASINO_CARD' | 'CASINO_PRIZE' }>;
// Randomness and the date are produced where the reducer runs: on the server in server mode.
export const reduceCasino = (state: GameState, action: CasinoAction): GameState => {
  const casino = normalizeCasino(state.casino);
  if (action.type === 'CASINO_SAFE') {
    if (!Number.isInteger(action.choice) || action.choice < 0 || action.choice > 2 || (casino.lastSafeDate && casino.lastSafeDate >= todayUtc())) return state;
    const reward = Math.floor(Math.random() * 3);
    const label = ['10 патронов', '5 спичек', '10 припасов'][reward];
    return { ...state, bullets: state.bullets + (reward === 0 ? 10 : 0), matches: state.matches + (reward === 1 ? 5 : 0), gold: state.gold + (reward === 2 ? 10 : 0),
      casino: { ...casino, chips: casino.chips + 10, lastSafeDate: todayUtc(), result: `Сейф ${action.choice + 1}: 10 фишек казино и ${label}.`, reels: [] } };
  }
  if (action.type === 'CASINO_PRIZE') {
    const prize = CASINO_PRIZES.find(p => p.id === action.prizeId);
    if (!prize) return state;
    if (casino.owned.includes(prize.id)) return { ...state, casino: { ...casino, equipped: casino.equipped === prize.id ? null : prize.id, result: casino.equipped === prize.id ? 'Значок снят.' : `Значок «${prize.name}» установлен в профиле.` } };
    if (casino.points < prize.cost) return state;
    return { ...state, casino: { ...casino, points: casino.points - prize.cost, owned: [...casino.owned, prize.id], equipped: prize.id, result: `Получен значок «${prize.name}». Он установлен в профиле.` } };
  }
  if (casino.chips < CASINO_BET) return state;
  if (action.type === 'CASINO_CARD') {
    if (!Number.isInteger(action.choice) || action.choice < 0 || action.choice > 2) return state;
    // The three outcomes are uniformly shuffled; the player's selection is not sent as a result.
    const outcome = Math.floor(Math.random() * 3);
    const payout = [0, 5, 10][outcome];
    const label = ['пусто', 'возврат ставки', 'выигрыш'][outcome];
    return { ...state, casino: { ...casino, chips: casino.chips - CASINO_BET + payout, points: casino.points + 1, plays: casino.plays + 1,
      reels: [], result: `Карта ${action.choice + 1}: ${label}. Получено ${payout} фишек.` } };
  }
  const symbols = ['🥤', '🔫', '🧟', '📻'];
  const reels = Array.from({ length: 3 }, () => symbols[Math.floor(Math.random() * symbols.length)]);
  const triple = reels[0] === reels[1] && reels[1] === reels[2];
  const pair = reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2];
  const payout = triple ? (reels[0] === '📻' ? 30 : 20) : pair ? 3 : 0;
  return { ...state, casino: { ...casino, chips: casino.chips - CASINO_BET + payout, points: casino.points + 1, plays: casino.plays + 1,
    reels, result: `${triple ? 'Три символа!' : pair ? 'Пара символов.' : 'Совпадений нет.'} Получено ${payout} фишек.` } };
};
