import { todayLocal } from './survival';

export interface LoginReward { bullets: number; gold: number; matches: number; medkits: number }
export interface LoginRewardState { lastClaimDate: string | null; streak: number }

// Припасы — игровая валюта; премиум-золото здесь не выдаётся.
export const LOGIN_REWARDS: LoginReward[] = [
  { bullets: 30, gold: 0, matches: 0, medkits: 0 },
  { bullets: 40, gold: 0, matches: 10, medkits: 0 },
  { bullets: 50, gold: 25, matches: 0, medkits: 0 },
  { bullets: 60, gold: 0, matches: 20, medkits: 0 },
  { bullets: 75, gold: 50, matches: 0, medkits: 0 },
  { bullets: 100, gold: 0, matches: 30, medkits: 1 },
  { bullets: 150, gold: 100, matches: 0, medkits: 2 },
];

export const normalizeLoginRewards = (value?: Partial<LoginRewardState> | null): LoginRewardState => {
  const date = typeof value?.lastClaimDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.lastClaimDate) ? value.lastClaimDate : null;
  const streak = typeof value?.streak === 'number' && Number.isInteger(value.streak) && value.streak >= 1 && value.streak <= LOGIN_REWARDS.length ? value.streak : 0;
  return date && streak ? { lastClaimDate: date, streak } : { lastClaimDate: null, streak: 0 };
};

export const loginRewardStatus = (state: LoginRewardState, now = Date.now()) => {
  const today = todayLocal(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const previousDay = todayLocal(yesterday.getTime());
  const last = state.lastClaimDate;
  const available = !last || last < today;
  const day = !available ? state.streak : last === previousDay && state.streak < LOGIN_REWARDS.length ? state.streak + 1 : 1;
  return { available, day, today, reset: available && !!last && last !== previousDay };
};
