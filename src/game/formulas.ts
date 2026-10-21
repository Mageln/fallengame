import {
  BLOCK_COUNTER_CHANCE,
  BLOCK_HEAL,
  BLOCK_REDUCTION,
  COMBO_STREAK_TIERS,
  DISTRICTS,
  DRY_FIRE_MUL,
  DURABILITY_LOSS_BY_TYPE,
  ENRAGE_MUL,
  EVADE_BONUS,
  GUARANTEED_CRIT_STREAK,
  INVENTORY_ITEMS,
  WEAPON_DAMAGE_PER_LEVEL,
  WEAK_POINT_MUL,
} from './constants';
import { GameState, Rarity, Weapon } from './types';

// ── БОЕВОЕ ЯДРО (Блок 2) ─────────────────────────────────────────────────────
// Все функции чистые: принимают состояние/оружие, возвращают число.
// Случайность (броски точности и крита) вынесена в computeDamage,
// чтобы reducer оставался единственной точкой рандома.

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export interface ModsBonus {
  damageMul: number;
  accuracy: number;
  crit: number;
  durabilityMul: number;
}

// Суммарный вклад обвесов в характеристики ствола.
export const modsBonus = (w: Weapon): ModsBonus =>
  w.mods.reduce<ModsBonus>(
    (acc, mod) => ({
      damageMul: acc.damageMul * (mod.damageMul ?? 1),
      accuracy: acc.accuracy + (mod.accuracyBonus ?? 0),
      crit: acc.crit + (mod.critBonus ?? 0),
      durabilityMul: acc.durabilityMul * (mod.durabilityMul ?? 1),
    }),
    { damageMul: 1, accuracy: 0, crit: 0, durabilityMul: 1 }
  );

// Прочность с учётом обвесов (сварка даёт +50% к запасу).
export const maxDurabilityOf = (w: Weapon) => Math.round(w.maxDurability * modsBonus(w).durabilityMul);

// Износ: пока прочность ниже 25%, оружие бьёт на 70% силы.
export const wearMultiplier = (w: Weapon): number =>
  maxDurabilityOf(w) > 0 && w.durability / maxDurabilityOf(w) < 0.25 ? 0.7 : 1;

// Урон самого оружия (было: baseDamage + level*3 + upgraded?5).
// Новые поля (обвесы, износ) при отсутствии дают прежний результат.
export const weaponDamageOf = (w: Weapon): number => {
  if (w.broken) return 0;
  const base = w.baseDamage + w.level * WEAPON_DAMAGE_PER_LEVEL + (w.upgraded ? 5 : 0);
  return Math.round(base * modsBonus(w).damageMul * wearMultiplier(w));
};

export const weaponDamage = (state: GameState) => weaponDamageOf(state.weapon);

export const weaponAccuracyOf = (w: Weapon) => clamp(w.accuracy + modsBonus(w).accuracy, 0, 0.99);

export const ammoCostOf = (w: Weapon) => (w.ammoType === 'none' ? 0 : w.ammoPerShot);

export const durabilityLossOf = (w: Weapon) => DURABILITY_LOSS_BY_TYPE[w.type];

// Сила: +2% урона за пункт.
export const strengthMultiplier = (state: GameState) => 1 + state.attributes.strength * 0.02;

// Итоговый урон персонажа без модификаторов хода.
export const totalDamage = (state: GameState) =>
  Math.round(
    (8 + state.level * 2 + weaponDamage(state) + equipmentDamage(state.equipmentIds)) *
      strengthMultiplier(state)
  );

// Точность удара: ствол + ловкость (1% за пункт) − дебафф от крикунов.
export const playerAccuracy = (state: GameState, aimDebuffTurns = 0) =>
  clamp(
    weaponAccuracyOf(state.weapon) + state.attributes.agility * 0.01 - (aimDebuffTurns > 0 ? 0.2 : 0),
    0.2,
    0.98
  );

// Крит: удача (как раньше: luck/2000) + собственный крит ствола + обвесы + бонус серии.
export const critChance = (state: GameState, comboBonus = 0): number =>
  clamp(
    (totalLuck(state) + state.attributes.luck * 10) / 2000 +
      state.weapon.critChance +
      modsBonus(state.weapon).crit +
      comboBonus,
    0,
    0.75
  );

export const guaranteedCrit = (streak: number) => streak >= GUARANTEED_CRIT_STREAK;

// Уклонение: ловкость + немного удачи.
export const playerEvasion = (state: GameState) =>
  clamp(state.attributes.agility / 200 + totalLuck(state) / 4000, 0, 0.5);

// Броня из экипировки (пока считается из staminaBonus снаряжения).
export const playerArmor = (state: GameState) =>
  Math.round(equipmentStamina(state.equipmentIds) * 0.5);

// Шанс контратаки из блока.
export const blockCounterChance = (state: GameState) =>
  clamp(BLOCK_COUNTER_CHANCE + state.attributes.agility / 300, 0, 0.75);

// Множитель урона за серию попаданий подряд.
export const comboMultiplier = (streak: number): number =>
  COMBO_STREAK_TIERS.find((t) => streak >= t.min)?.mul ?? 1;

// Шквал (автоматная очередь): число выстрелов за ход зависит от скорострельности.
export const burstShots = (w: Weapon) => clamp(Math.round(w.attackSpeed / 3), 2, 4);

// Защита: сколько срезаем входящего урона, с каким шансом контратакуем и сколько лечим.
export const blockGuard = (state: GameState) => ({
  reduction: BLOCK_REDUCTION,
  counterChance: blockCounterChance(state),
  heal: Math.round(totalStamina(state) * BLOCK_HEAL),
});

// Шанс уклонения: пассивный от ловкости + бонус подготовленного ухода.
export const evadeChance = (state: GameState, prepared = false) =>
  clamp(playerEvasion(state) + (prepared ? EVADE_BONUS : 0), 0, 0.85);

// Базовый урон босса (та же формула, что была в бою раньше).
export const bossBaseDamage = (bossMaxHp: number) => 6 + Math.floor(bossMaxHp / 40);

// Аптечка: интеллект усиливает лечение.
export const medkitHeal = (state: GameState) => 35 + state.attributes.intellect * 2;

export interface DamageOutcome {
  damage: number;
  crit: boolean;
  missed: boolean;
}

export interface DamageOptions {
  techniqueMul?: number; // множитель спецприёма
  comboMul?: number; // множитель серии (например 0.7 на удар)
  streakMul?: number; // множитель за набранную серию
  pierce?: number; // 0..1 — доля брони, которую игнорируем
  targetArmor?: number; // плоская броня цели
  targetEvasion?: number; // уклонение цели
  weaknessMul?: number; // 1.25, если тип оружия совпал со слабостью цели
  weakPoint?: boolean; // открытая слабая точка
  dryFire?: boolean; // стреляем нечем — урон прикладом
  forceCrit?: boolean; // гарантированный крит
}

// Полный расчёт урона игрока по цели.
// Порядок: точность → база → броня → крит → слабость → слабая точка → серия → спецприём.
export const computeDamage = (state: GameState, o: DamageOptions = {}): DamageOutcome => {
  const w = state.weapon;

  if (w.broken && w.type !== 'melee') {
    return { damage: 1, crit: false, missed: false };
  }

  const accuracy = playerAccuracy(state, o.dryFire ? 1 : 0);
  if (Math.random() > clamp(accuracy - (o.targetEvasion ?? 0), 0.2, 0.98)) {
    return { damage: 0, crit: false, missed: true };
  }

  const crit = o.forceCrit === true || Math.random() < critChance(state);
  const critMul = crit ? w.critDamage : 1;

  const armor = Math.max(0, (o.targetArmor ?? 0) * (1 - (o.pierce ?? 0)));
  const afterArmor = Math.max(1, totalDamage(state) - armor);

  const mul =
    (o.techniqueMul ?? 1) *
    (o.comboMul ?? 1) *
    (o.streakMul ?? 1) *
    critMul *
    (o.weaknessMul ?? 1) *
    (o.weakPoint ? WEAK_POINT_MUL : 1) *
    (o.dryFire ? DRY_FIRE_MUL : 1);

  return { damage: Math.max(1, Math.round(afterArmor * mul)), crit, missed: false };
};

// Ответный удар после уклонения: без бонусов серии, неполный урон.
export const counterDamage = (state: GameState, mul: number): number =>
  Math.max(1, Math.round(totalDamage(state) * mul));

// Урон босса по игроку с учётом блока, брони и уклонения.
export interface IncomingOptions {
  blocking?: boolean;
  evaded?: boolean;
  armor?: number;
  enraged?: boolean;
}

export const resolveIncoming = (
  state: GameState,
  baseDamage: number,
  o: IncomingOptions = {}
): { damage: number; evaded: boolean } => {
  if (o.evaded) return { damage: 0, evaded: true };
  const enragedMul = o.enraged ? ENRAGE_MUL : 1;
  const blockedMul = o.blocking ? BLOCK_REDUCTION : 1;
  const raw = baseDamage * enragedMul * blockedMul;
  const mitigated = Math.max(1, raw - playerArmor(state) * (o.blocking ? 0.5 : 1));
  return { damage: Math.max(1, Math.round(mitigated)), evaded: false };
};

export const dateKey = (d = new Date()) => d.toISOString().slice(0, 10);

export const weekKey = (d = new Date()) => {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${week}`;
};

export const staminaUpgradeCost = (baseStamina: number) => 10 + baseStamina * 2;

export const luckUpgradeCost = (luck: number) => 8 + Math.floor(luck / 4);

export const levelUpCost = (level: number) => 40 + level * 15;

export const carUpgradeCost = (carLevel: number) => ({
  energy: 6 + Math.floor(carLevel / 2),
  matches: 4 + Math.floor(carLevel / 3),
});

export const weaponUpgradeCost = (level: number) => 18 + level * 12;

export const weaponUpgradeUpgradeCost = () => 150;

export const weaponRepairCost = () => 15;

export const equipmentStamina = (ids: string[]) =>
  ids.reduce((sum, id) => sum + (INVENTORY_ITEMS.find((item) => item.id === id)?.staminaBonus ?? 0), 0);

export const equipmentDamage = (ids: string[]) =>
  ids.reduce((sum, id) => sum + (INVENTORY_ITEMS.find((item) => item.id === id)?.damageBonus ?? 0), 0);

export const equipmentLuck = (ids: string[]) =>
  ids.reduce((sum, id) => sum + (INVENTORY_ITEMS.find((item) => item.id === id)?.luckBonus ?? 0), 0);

export const totalStamina = (state: GameState) =>
  state.baseStamina + equipmentStamina(state.equipmentIds) + state.level * 2 + state.attributes.endurance * 6;

export const totalLuck = (state: GameState) =>
  state.luck + equipmentLuck(state.equipmentIds) + state.attributes.luck;

export const staminaPerBullet = (state: GameState) =>
  staminaUpgradeCost(state.baseStamina) / 5;

export const getDistrict = (id: string) => DISTRICTS.find((d) => d.id === id);

export const canEnterDistrict = (state: GameState, districtId: string) => {
  const district = getDistrict(districtId);
  if (!district) return false;
  return state.carLevel >= district.carLevel;
};

export const rarityWeight = (rarity: Rarity): number => {
  switch (rarity) {
    case 'common': return 50;
    case 'uncommon': return 30;
    case 'rare': return 13;
    case 'epic': return 5;
    case 'legendary': return 2;
    default: return 0;
  }
};

export const lootDrop = (): { itemId: string; count: number }[] => {
  const weights: { id: string; rarity: Rarity; count: number }[] = [
    { id: 'scrap_metal', rarity: 'common', count: 1 + Math.floor(Math.random() * 3) },
    { id: 'leather', rarity: 'common', count: 1 + Math.floor(Math.random() * 2) },
    { id: 'gun_parts', rarity: 'uncommon', count: 1 + Math.floor(Math.random() * 2) },
    { id: 'explosives', rarity: 'uncommon', count: 1 + Math.floor(Math.random() * 2) },
    { id: 'med_components', rarity: 'uncommon', count: 1 + Math.floor(Math.random() * 2) },
    { id: 'tactical_vest', rarity: 'rare', count: 1 },
    { id: 'sniper_scope', rarity: 'rare', count: 1 },
    { id: 'rare_crystal', rarity: 'epic', count: 1 },
    { id: 'lucky_amulet', rarity: 'epic', count: 1 },
    { id: 'legendary_armor', rarity: 'legendary', count: 1 },
  ];
  
  const totalWeight = weights.reduce((s, w) => s + rarityWeight(w.rarity), 0);
  let roll = Math.random() * totalWeight;
  const result: { itemId: string; count: number }[] = [];
  
  for (const w of weights) {
    roll -= rarityWeight(w.rarity);
    if (roll <= 0) {
      result.push({ itemId: w.id, count: w.count });
      break;
    }
  }
  
  return result;
};
