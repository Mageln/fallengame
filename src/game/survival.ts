// Правила применяются и к локальному сохранению, и к серверным операциям.
export const DAILY_BOSS_ATTACKS = 3;
export const EXTRA_ATTACK_PRICE = 20;

// false — тестовый режим: не ограничивать нападения.
// true — лимиты восстанавливаются через два часа после первого нападения.
export const BOSS_ATTACK_CONFIG: { timedLimits: boolean; resetIntervalMs: number } = {
  timedLimits: false,
  resetIntervalMs: 2 * 60 * 60 * 1000,
};

// Цена докупки атаки на конкретного босса (тестовый режим — за крышки).
// Чем сильнее босс (меньше бесплатных попыток), тем дороже докупка.
export const bossAttackPrice = (dailyLimit: number): number =>
  EXTRA_ATTACK_PRICE + Math.max(0, DAILY_BOSS_ATTACKS - dailyLimit) * 10;
export const RAID_TASK_GOLD_PRICE = 30;
export const BOSS_DURATION_MS = 3 * 60_000;
export const BOSS_COUNTER_MS = 8_000;
// Боевой заряд не связан с обычной энергией для заданий.
export const BOSS_ENERGY_MAX = 100;
export const BOSS_ENERGY_PER_HIT = 20;
export const BOSS_WEAPON_COST = 10;
export const BOSS_BLOCK_COST = 20;
export const BOSS_HEAL_COST = 50;
export const ROOM_BASE_CHANCE = 0.05;
export const ROOM_DAMAGE_FACTOR = 0.0005;
export const ROOM_MAX_CHANCE = 0.5;

export const roomDropChance = (damage: number): number =>
  Math.min(ROOM_MAX_CHANCE, ROOM_BASE_CHANCE + Math.max(0, Number.isFinite(damage) ? damage : 0) * ROOM_DAMAGE_FACTOR);

export const todayUtc = (now = Date.now()): string => new Date(now).toISOString().slice(0, 10);
export const nextResetUtc = (now = Date.now()): number => Date.parse(`${todayUtc(now)}T00:00:00.000Z`) + 86_400_000;

// Дата и следующая полночь в часовом поясе устройства игрока.
export const todayLocal = (now = Date.now()): string => {
  const date = new Date(now);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};
export const nextResetLocal = (now = Date.now()): number => {
  const date = new Date(now);
  date.setHours(24, 0, 0, 0);
  return date.getTime();
};

export const BOSS_SKILLS = [
  { id: 'jab', name: 'Удар кулаком', icon: '👊', energyCost: 0 },
  { id: 'weapon', name: 'Удар оружием', icon: '⚔️', energyCost: BOSS_WEAPON_COST },
  { id: 'block', name: 'Блок', icon: '🛡️', energyCost: BOSS_BLOCK_COST },
  { id: 'heal', name: 'Исцеление', icon: '💚', energyCost: BOSS_HEAL_COST },
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
