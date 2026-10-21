export const CLAN_COST = 2500;
export const CLAN_MEMBER_BONUS = 25;
export const CLAN_MAX_MEMBERS = 300;
export const EMBLEMS = ['skull', 'axe', 'mask', 'fuel'] as const;

export const CONTRACTS = {
  clear_streets: { event: 'zombie', period: 'daily', target: 100, points: 500 },
  clan_raids: { event: 'raid', period: 'weekly', target: 5, points: 1000 },
  medkit_stock: { event: 'medkit', period: 'weekly', target: 50, points: 300 },
  barricade: { event: 'barricade', period: 'daily', target: 1, points: 700 },
} as const;

export type ContractId = keyof typeof CONTRACTS;

export const normalizeName = (value: string): string => value.normalize('NFKC').trim().replace(/\s+/g, ' ');

const forbiddenWords = /(?:^|[^\p{L}])(?:бля\p{L}*|пизд\p{L}*|хуй\p{L}*|хуе\p{L}*|еба\p{L}*|ёба\p{L}*|ебл\p{L}*|сука|fuck\p{L}*)(?=$|[^\p{L}])/iu;

export const validateName = (value: unknown): string | null => {
  if (typeof value !== 'string') return 'Название обязательно.';
  const name = normalizeName(value);
  if (Array.from(name).length < 3 || Array.from(name).length > 20) return 'Название: от 3 до 20 символов.';
  if (!/^[\p{L}\p{N} .'-]+$/u.test(name)) return 'Недопустимые символы в названии.';
  if (forbiddenWords.test(name)) return 'Выберите название без ругательств.';
  return null;
};

export const periodKey = (period: 'daily' | 'weekly', now = new Date()): string => {
  if (period === 'daily') return now.toISOString().slice(0, 10);
  const weekDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = weekDate.getUTCDay() || 7;
  weekDate.setUTCDate(weekDate.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(weekDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((weekDate.getTime() - start.getTime()) / 86400000 + 1) / 7);
  return `${weekDate.getUTCFullYear()}-W${week}`;
};
