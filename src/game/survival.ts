// Правила применяются и к локальному сохранению, и к серверным операциям.
export const DAILY_BOSS_ATTACKS = 3;
export const EXTRA_ATTACK_PRICE = 20;
export const RAID_TASK_GOLD_PRICE = 30;
export const BOSS_DURATION_MS = 3 * 60_000;
export const BOSS_COUNTER_MS = 8_000;
export const ROOM_BASE_CHANCE = 0.05;
export const ROOM_DAMAGE_FACTOR = 0.0005;
export const ROOM_MAX_CHANCE = 0.5;

export const roomDropChance = (damage: number): number =>
  Math.min(ROOM_MAX_CHANCE, ROOM_BASE_CHANCE + Math.max(0, Number.isFinite(damage) ? damage : 0) * ROOM_DAMAGE_FACTOR);

export const todayUtc = (now = Date.now()): string => new Date(now).toISOString().slice(0, 10);
export const nextResetUtc = (now = Date.now()): number => Date.parse(`${todayUtc(now)}T00:00:00.000Z`) + 86_400_000;

export const BOSS_SKILLS = [
  { id: 'jab', name: 'Прямой', icon: '👊', multiplier: 1, cooldown: 0, ammo: 0 },
  { id: 'hook', name: 'Хук', icon: '🥊', multiplier: 1.25, cooldown: 1, ammo: 0 },
  { id: 'uppercut', name: 'Апперкот', icon: '✊', multiplier: 1.5, cooldown: 2, ammo: 0 },
  { id: 'spin', name: 'Разворот', icon: '🌀', multiplier: 1.7, cooldown: 3, ammo: 0 },
  { id: 'finisher', name: 'Добивающий', icon: '☠', multiplier: 2.2, cooldown: 4, ammo: 1 },
  { id: 'flurry', name: 'Серия', icon: '⚡', multiplier: 1.8, cooldown: 3, ammo: 1 },
  { id: 'guard', name: 'Блок-удар', icon: '🛡', multiplier: 0.8, cooldown: 1, ammo: 0 },
  { id: 'critical', name: 'Критический', icon: '💥', multiplier: 2.5, cooldown: 5, ammo: 2 },
] as const;
export type BossSkillId = typeof BOSS_SKILLS[number]['id'];

export const RAID_DANGER_TASKS = [
  { id: 'barricade', title: 'Укрепить проход', energy: 6, tokens: 2, hp: 8 },
  { id: 'medicine', title: 'Обыскать медпункт', energy: 8, tokens: 3, hp: 12 },
  { id: 'signal', title: 'Включить рацию', energy: 10, tokens: 4, hp: 15 },
] as const;

export type ResourceSource = 'raid' | 'boss' | 'solo-task' | 'donation' | 'shop' | 'daily' | 'clan';
export interface ResourceEvent {
  id: string;
  at: number;
  source: ResourceSource;
  resource: 'matches' | 'bullets' | 'tokens' | 'premiumGold' | 'supplies';
  amount: number;
}
