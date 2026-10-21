import type { ClanEmblem, ClanState, ClanTaskEvent, ClanTaskProgress } from './types';

export const CLAN_MEMBER_BONUS = 25;

export const CLAN_EMBLEMS: { id: ClanEmblem; icon: string; label: string }[] = [
  { id: 'skull', icon: '☠', label: 'Череп' },
  { id: 'axe', icon: '🪓', label: 'Топор' },
  { id: 'mask', icon: '☣', label: 'Противогаз' },
  { id: 'fuel', icon: '⛽', label: 'Канистра' },
];

export interface ClanContract {
  id: string;
  title: string;
  description: string;
  period: 'daily' | 'weekly';
  event: ClanTaskEvent;
  target: number;
  points: number;
  icon: string;
}

export const CLAN_CONTRACTS: ClanContract[] = [
  { id: 'clear_streets', title: 'Зачистить 100 зомби вместе', description: 'Уничтожайте заражённых в боях.', period: 'daily', event: 'zombie', target: 100, points: 500, icon: '☠' },
  { id: 'clan_raids', title: 'Победить в 5 клановых рейдах', description: 'Забирайте награду за завершённые рейды.', period: 'weekly', event: 'raid', target: 5, points: 1000, icon: '📻' },
  { id: 'medkit_stock', title: 'Собрать 50 аптечек', description: 'Добывайте аптечки в рейдах и мастерской.', period: 'weekly', event: 'medkit', target: 50, points: 300, icon: '✚' },
  { id: 'barricade', title: 'Построить баррикаду', description: 'Смастерите баррикаду из найденного металлолома.', period: 'daily', event: 'barricade', target: 1, points: 700, icon: '🪓' },
];

export const clanRating = (clan: Pick<ClanState, 'taskPoints' | 'members'>): number =>
  clan.taskPoints + clan.members.length * CLAN_MEMBER_BONUS;

export const clanPeriodKey = (period: ClanContract['period'], now = new Date()): string => {
  if (period === 'daily') return now.toISOString().slice(0, 10);
  const weekDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = weekDate.getUTCDay() || 7;
  weekDate.setUTCDate(weekDate.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(weekDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((weekDate.getTime() - start.getTime()) / 86400000 + 1) / 7);
  return `${weekDate.getUTCFullYear()}-W${week}`;
};

export const getContractProgress = (clan: ClanState, contract: ClanContract): ClanTaskProgress => {
  const key = clanPeriodKey(contract.period);
  const saved = clan.taskProgress[contract.id];
  return saved?.periodKey === key ? saved : { periodKey: key, value: 0, completed: false };
};

export const advanceClanContracts = (clan: ClanState, event: ClanTaskEvent, amount: number): {
  clan: ClanState;
  awarded: number;
} => {
  if (!Number.isInteger(amount) || amount < 1) return { clan, awarded: 0 };
  let points = 0;
  let changed = false;
  const taskProgress = { ...clan.taskProgress };

  for (const contract of CLAN_CONTRACTS) {
    if (contract.event !== event) continue;
    const current = getContractProgress(clan, contract);
    if (current.completed) continue;
    const value = Math.min(contract.target, current.value + amount);
    const completed = value === contract.target;
    taskProgress[contract.id] = { periodKey: current.periodKey, value, completed };
    changed = true;
    if (completed) points += contract.points;
  }

  if (!changed) return { clan, awarded: 0 };
  const next = { ...clan, taskProgress, taskPoints: clan.taskPoints + points };
  return { clan: { ...next, rating: clanRating(next) }, awarded: points };
};

export const normalizeClanName = (value: string): string => value.normalize('NFKC').trim().replace(/\s+/g, ' ');

const forbiddenWords = /(?:^|[^\p{L}])(?:бля\p{L}*|пизд\p{L}*|хуй\p{L}*|хуе\p{L}*|еба\p{L}*|ёба\p{L}*|ебл\p{L}*|сука|fuck\p{L}*)(?=$|[^\p{L}])/iu;

export const validateClanName = (value: string, clans: Pick<ClanState, 'name'>[]): string | null => {
  const name = normalizeClanName(value);
  const length = Array.from(name).length;
  if (length < 3 || length > 20) return 'Название: от 3 до 20 символов.';
  if (!/^[\p{L}\p{N} .'-]+$/u.test(name)) return 'В названии допустимы буквы, цифры, пробел, точка и дефис.';
  if (forbiddenWords.test(name)) return 'Выберите другое название без ругательств.';
  if (clans.some((clan) => normalizeClanName(clan.name).toLocaleLowerCase('ru-RU') === name.toLocaleLowerCase('ru-RU'))) {
    return 'Такое убежище уже существует.';
  }
  return null;
};
