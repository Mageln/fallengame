import { DISTRICTS, INVENTORY_ITEMS, WEAPON_DAMAGE_PER_LEVEL } from './constants';
import { GameState, Rarity } from './types';

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
  state.baseStamina + equipmentStamina(state.equipmentIds) + state.level * 2;

export const totalLuck = (state: GameState) => state.luck + equipmentLuck(state.equipmentIds);

export const weaponDamage = (state: GameState) => {
  if (state.weapon.broken) return 0;
  return state.weapon.baseDamage + state.weapon.level * WEAPON_DAMAGE_PER_LEVEL + (state.weapon.upgraded ? 5 : 0);
};

export const totalDamage = (state: GameState) =>
  8 + state.level * 2 + weaponDamage(state) + equipmentDamage(state.equipmentIds);

export const critChance = (state: GameState) => Math.min(0.75, totalLuck(state) / 2000);

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

export const lootDrop = (districtCarLevel: number): { itemId: string; count: number }[] => {
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
