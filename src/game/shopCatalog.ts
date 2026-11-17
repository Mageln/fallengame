import { weaponImage } from './weaponImages';
import type { InventoryItem, Weapon } from './types';

type Price = { gold: number; premium: number };
export type ShopWeapon = { weapon: Weapon; image: string; price: Price };
export type ClothingEffect = 'fire' | 'electric' | 'toxic' | 'cosmic';
export type ShopClothing = { item: InventoryItem; slot: 'head' | 'body' | 'legs' | 'feet'; image: string; price: Price; currencies: readonly ('gold' | 'premium')[]; effect?: ClothingEffect };
const weapon = (id: string, name: string, icon: string, type: Weapon['type'], damage: number, rarity: Weapon['rarity'], price: Price): ShopWeapon => ({
  weapon: { id, name, icon, type, rarity, baseDamage: damage, attackSpeed: type === 'melee' ? 7 : 6, accuracy: type === 'melee' ? 0.82 : 0.8, critChance: 0.05, critDamage: 1.8, range: type === 'melee' ? 1 : 4, ammoType: type === 'melee' ? 'none' : 'bullets', ammoPerShot: type === 'melee' ? 0 : 1, durability: 100, maxDurability: 100, level: 0, upgraded: false, broken: false, mods: [] }, image: weaponImage(id) ?? `/icon/shop/${id}.svg`, price,
});
export const SHOP_WEAPONS: ShopWeapon[] = [
  weapon('shop_knuckles', 'Кастет выжившего', '👊', 'melee', 8, 'common', { gold: 250, premium: 20 }),
  weapon('shop_bat', 'Обычная бита', '🏏', 'melee', 12, 'common', { gold: 500, premium: 35 }),
  weapon('shop_pistol', 'Пистолет дозорного', '🔫', 'firearm', 16, 'uncommon', { gold: 900, premium: 60 }),
  weapon('shop_smg', 'Пистолет-пулемёт', '🔫', 'firearm', 21, 'rare', { gold: 1500, premium: 95 }),
  weapon('shop_rifle', 'Автомат рейдера', '🔫', 'firearm', 28, 'epic', { gold: 2400, premium: 150 }),
  weapon('shop_branch', 'Заострённая ветка', '🪵', 'melee', 5, 'common', { gold: 150, premium: 10 }),
  weapon('shop_deagle', 'Desert Eagle', '🔫', 'firearm', 24, 'rare', { gold: 1800, premium: 120 }),
  weapon('shop_m4a4', 'M4A4', '🔫', 'firearm', 30, 'epic', { gold: 2800, premium: 180 }),
  weapon('shop_awp', 'AWP', '🎯', 'firearm', 38, 'epic', { gold: 3500, premium: 230 }),
];
const clothing = (id: string, name: string, icon: string, slot: ShopClothing['slot'], stamina: number, damage: number, luck: number, rarity: InventoryItem['rarity'], price: Price, currencies: ShopClothing['currencies'] = ['gold', 'premium'], effect?: ClothingEffect): ShopClothing => ({
  item: { id, name, icon, rarity, staminaBonus: stamina, damageBonus: damage, luckBonus: luck, costBullets: 0 }, slot, image: id === 'shop_cap' ? '/characters/survivor-cap-v2.png' : id.startsWith('mil_') ? `/characters/clothing/${id}.png` : `/icon/shop/${id}.svg`, price, currencies, effect,
});
export const SHOP_CLOTHING: ShopClothing[] = [
  clothing('shop_cap', 'Кепка разведчика', '🧢', 'head', 8, 0, 12, 'common', { gold: 180, premium: 15 }),
  clothing('shop_helmet', 'Шлем дозорного', '⛑️', 'head', 20, 2, 0, 'rare', { gold: 650, premium: 45 }),
  clothing('shop_jacket', 'Куртка сталкера', '🧥', 'body', 15, 3, 10, 'uncommon', { gold: 400, premium: 30 }),
  clothing('shop_armor', 'Броня мародёра', '🦺', 'body', 35, 8, 0, 'epic', { gold: 1200, premium: 80 }),
  clothing('shop_pants', 'Штаны дозорного', '👖', 'legs', 14, 1, 5, 'uncommon', { gold: 350, premium: 25 }),
  clothing('shop_boots', 'Берцы рейдера', '👢', 'feet', 12, 3, 8, 'common', { gold: 320, premium: 25 }),
  clothing('head_ranger', 'Шапка следопыта', '🎩', 'head', 12, 1, 5, 'uncommon', { gold: 420, premium: 0 }, ['gold']),
  clothing('head_inferno', 'Шлем пепельного огня', '🔥', 'head', 25, 5, 5, 'epic', { gold: 0, premium: 120 }, ['premium'], 'fire'),
  clothing('head_volt', 'Маска грозы', '⚡', 'head', 22, 4, 12, 'epic', { gold: 0, premium: 140 }, ['premium'], 'electric'),
  clothing('body_traveler', 'Куртка странника', '🧥', 'body', 18, 4, 6, 'uncommon', { gold: 550, premium: 0 }, ['gold']),
  clothing('body_inferno', 'Броня пепельного огня', '🔥', 'body', 40, 9, 4, 'epic', { gold: 0, premium: 220 }, ['premium'], 'fire'),
  clothing('body_toxic', 'Костюм заражённой зоны', '☢️', 'body', 32, 7, 14, 'epic', { gold: 0, premium: 240 }, ['premium'], 'toxic'),
  clothing('legs_traveler', 'Штаны странника', '👖', 'legs', 12, 2, 7, 'common', { gold: 400, premium: 0 }, ['gold']),
  clothing('legs_raider', 'Штаны мародёра', '👖', 'legs', 20, 4, 2, 'rare', { gold: 700, premium: 0 }, ['gold']),
  clothing('legs_volt', 'Штаны грозы', '⚡', 'legs', 23, 5, 9, 'epic', { gold: 0, premium: 160 }, ['premium'], 'electric'),
  clothing('legs_cosmic', 'Штаны звёздного дозора', '✨', 'legs', 22, 3, 15, 'epic', { gold: 0, premium: 180 }, ['premium'], 'cosmic'),
  clothing('feet_traveler', 'Ботинки странника', '🥾', 'feet', 10, 1, 9, 'common', { gold: 380, premium: 0 }, ['gold']),
  clothing('feet_guard', 'Берцы дозорного', '🥾', 'feet', 18, 3, 4, 'rare', { gold: 650, premium: 0 }, ['gold']),
  clothing('feet_inferno', 'Ботинки пепельного огня', '🔥', 'feet', 20, 6, 6, 'epic', { gold: 0, premium: 150 }, ['premium'], 'fire'),
  clothing('feet_cosmic', 'Ботинки звёздного дозора', '✨', 'feet', 20, 3, 14, 'epic', { gold: 0, premium: 170 }, ['premium'], 'cosmic'),
  // Военная линейка зомбиапокалипсиса: сборная солянка выжившего, продаётся частями.
  clothing('mil_scout_head', 'Каска разведчика «Сталкер»', '🪖', 'head', 8, 1, 6, 'rare', { gold: 900, premium: 70 }),
  clothing('mil_scout_body', 'Разгрузка разведчика', '🎽', 'body', 12, 2, 5, 'rare', { gold: 1200, premium: 90 }),
  clothing('mil_scout_legs', 'Камуфляж разведчика', '👖', 'legs', 10, 1, 6, 'rare', { gold: 1000, premium: 80 }),
  clothing('mil_scout_feet', 'Ботинки разведчика', '🥾', 'feet', 9, 1, 7, 'rare', { gold: 850, premium: 65 }),
  clothing('mil_assault_head', 'Шлем штурмовика «Бастион»', '⛑️', 'head', 14, 2, 2, 'epic', { gold: 1800, premium: 130 }),
  clothing('mil_assault_body', 'Плитник штурмовика', '🦺', 'body', 20, 4, 1, 'epic', { gold: 2400, premium: 170 }),
  clothing('mil_assault_legs', 'Поножи штурмовика «Бастион»', '👖', 'legs', 16, 3, 1, 'epic', { gold: 2000, premium: 150 }),
  clothing('mil_assault_feet', 'Берцы штурмовика', '🥾', 'feet', 14, 2, 2, 'epic', { gold: 1700, premium: 120 }),
];
// Старая одежда снята с продажи, но купленное ранее остаётся рабочим и видимым.
export const isLegacyClothingId = (id: string): boolean => SHOP_CLOTHING.some(entry => entry.item.id === id && !entry.item.id.startsWith('mil_'));
export const shopClothingEntries = (): ShopClothing[] => SHOP_CLOTHING.filter(entry => entry.item.id.startsWith('mil_'));
export const SHOP_SUITS = [{
  item: { id: 'suit_fire', name: 'Костюм «Пепельный страж»', icon: '🔥', rarity: 'epic', staminaBonus: 0, damageBonus: 0, luckBonus: 0, costBullets: 0 } as InventoryItem,
  slot: 'suit' as const, image: '/characters/clothing/suit_fire_card.webp', price: { gold: 5000, premium: 300 }, currencies: ['gold', 'premium'] as const, effect: 'fire' as const,
}];
export const clothingSlot = (id: string): ShopClothing['slot'] | 'suit' | undefined =>
  SHOP_SUITS.find((entry) => entry.item.id === id)?.slot ??
  SHOP_CLOTHING.find((entry) => entry.item.id === id)?.slot ?? ({ helmet: 'head', vest: 'body', tactical_vest: 'body', legendary_armor: 'body', boots: 'feet' } as Record<string, ShopClothing['slot']>)[id];
