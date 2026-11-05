import type { InventoryItem, Weapon } from './types';

type Price = { gold: number; premium: number };
export type ShopWeapon = { weapon: Weapon; image: string; price: Price };
export type ShopClothing = { item: InventoryItem; slot: 'head' | 'body' | 'feet'; image: string; price: Price };
const weapon = (id: string, name: string, icon: string, type: Weapon['type'], damage: number, rarity: Weapon['rarity'], price: Price): ShopWeapon => ({
  weapon: { id, name, icon, type, rarity, baseDamage: damage, attackSpeed: type === 'melee' ? 7 : 6, accuracy: type === 'melee' ? 0.82 : 0.8, critChance: 0.05, critDamage: 1.8, range: type === 'melee' ? 1 : 4, ammoType: type === 'melee' ? 'none' : 'bullets', ammoPerShot: type === 'melee' ? 0 : 1, durability: 100, maxDurability: 100, level: 0, upgraded: false, broken: false, mods: [] }, image: `/icon/shop/${id}.svg`, price,
});
export const SHOP_WEAPONS: ShopWeapon[] = [
  weapon('shop_knuckles', 'Кастет выжившего', '👊', 'melee', 8, 'common', { gold: 250, premium: 20 }),
  weapon('shop_bat', 'Обычная бита', '🏏', 'melee', 12, 'common', { gold: 500, premium: 35 }),
  weapon('shop_pistol', 'Пистолет дозорного', '🔫', 'firearm', 16, 'uncommon', { gold: 900, premium: 60 }),
  weapon('shop_smg', 'Пистолет-пулемёт', '🔫', 'firearm', 21, 'rare', { gold: 1500, premium: 95 }),
  weapon('shop_rifle', 'Автомат рейдера', '🔫', 'firearm', 28, 'epic', { gold: 2400, premium: 150 }),
];
const clothing = (id: string, name: string, icon: string, slot: ShopClothing['slot'], stamina: number, damage: number, luck: number, rarity: InventoryItem['rarity'], price: Price): ShopClothing => ({
  item: { id, name, icon, rarity, staminaBonus: stamina, damageBonus: damage, luckBonus: luck, costBullets: 0 }, slot, image: `/icon/shop/${id}.svg`, price,
});
export const SHOP_CLOTHING: ShopClothing[] = [
  clothing('shop_cap', 'Шапка разведчика', '🧢', 'head', 8, 0, 12, 'common', { gold: 180, premium: 15 }),
  clothing('shop_helmet', 'Шлем дозорного', '⛑️', 'head', 20, 2, 0, 'rare', { gold: 650, premium: 45 }),
  clothing('shop_jacket', 'Куртка сталкера', '🧥', 'body', 15, 3, 10, 'uncommon', { gold: 400, premium: 30 }),
  clothing('shop_armor', 'Броня мародёра', '🦺', 'body', 35, 8, 0, 'epic', { gold: 1200, premium: 80 }),
  clothing('shop_boots', 'Берцы рейдера', '👢', 'feet', 12, 3, 8, 'common', { gold: 320, premium: 25 }),
];
export const clothingSlot = (id: string): ShopClothing['slot'] | undefined =>
  SHOP_CLOTHING.find((entry) => entry.item.id === id)?.slot ?? ({ helmet: 'head', vest: 'body', tactical_vest: 'body', legendary_armor: 'body', boots: 'feet' } as Record<string, ShopClothing['slot']>)[id];
