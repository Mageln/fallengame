import { InventoryItem, DailyQuest } from './types';

export const WEAPON_MAX_LEVEL = 10;
export const WEAPON_DAMAGE_PER_LEVEL = 3;
export const WEAPON_BREAK_CHANCE = 0.18;
export const CLAN_JOIN_LEVEL = 20;
export const CLAN_CREATE_LEVEL = 25;
export const CLAN_CREATE_GOLD = 100;
export const CLAN_MAX_MEMBERS = 300;
export const ENERGY_TICK_MS = 5000;
export const DAILY_GOLD = 5;
export const LEVEL_GOLD = 3;
export const INVENTORY_SLOTS = 20;

export const APPEARANCES: { id: 0 | 1 | 2 | 3 | 4 | 5; name: string; color: string }[] = [
  { id: 0, name: 'Выживший', color: '#d4a574' },
  { id: 1, name: 'Сталкер', color: '#8b7355' },
  { id: 2, name: 'Медик', color: '#c4c4c4' },
  { id: 3, name: 'Охотник', color: '#4a7c46' },
  { id: 4, name: 'Мародёр', color: '#6b3a3a' },
  { id: 5, name: 'Полицейский', color: '#3a4a6b' },
];

export const DISTRICTS = [
  { id: 'southgate', name: 'Саутгейт', carLevel: 1, energyCost: 8, bossId: 'resident', bossName: 'Житель', bossHp: 80 },
  { id: 'westend', name: 'Вестенд', carLevel: 10, energyCost: 12, bossId: 'citizen', bossName: 'Горожанин', bossHp: 160 },
  { id: 'market', name: 'Рынок', carLevel: 25, energyCost: 16, bossId: 'angry', bossName: 'Злой Горожанин', bossHp: 280 },
  { id: 'norted', name: 'Нортед', carLevel: 50, energyCost: 20, bossId: 'police', bossName: 'Полицейский', bossHp: 420 },
  { id: 'industrial', name: 'Промзона', carLevel: 70, energyCost: 26, bossId: 'marauder', bossName: 'Мародёр', bossHp: 650 },
  // Новые районы
  { id: 'docks', name: 'Доки', carLevel: 85, energyCost: 32, bossId: 'smuggler', bossName: 'Контрабандист', bossHp: 900 },
  { id: 'cathedral', name: 'Собор', carLevel: 95, energyCost: 38, bossId: 'preacher', bossName: 'Проповедник', bossHp: 1200 },
  { id: 'mansion', name: 'Усадьба', carLevel: 105, energyCost: 44, bossId: 'aristocrat', bossName: 'Аристократ', bossHp: 1600 },
  { id: 'military', name: 'Военная база', carLevel: 115, energyCost: 50, bossId: 'general', bossName: 'Генерал', bossHp: 2200 },
] as const;

export const RAIDS = [
  { id: 'house', name: 'Заброшенный дом', energy: 12, matches: 4, grenades: 1, medkits: 1 },
  { id: 'hospital', name: 'Больница', energy: 16, matches: 6, grenades: 2, medkits: 2 },
  { id: 'warehouse', name: 'Склад', energy: 20, matches: 8, grenades: 2, medkits: 2 },
  { id: 'marauder_base', name: 'База Мародёров', energy: 24, matches: 16, grenades: 5, medkits: 4 },
  // Новые рейды
  { id: 'military_outpost', name: 'Военный пост', energy: 30, matches: 20, grenades: 8, medkits: 6 },
  { id: 'government_bunker', name: 'Бункер правительства', energy: 40, matches: 30, grenades: 12, medkits: 10 },
] as const;

export const SHOP: InventoryItem[] = [
  { id: 'vest', name: 'Бронежилет', rarity: 'common', staminaBonus: 20, damageBonus: 0, luckBonus: 0, costBullets: 80, icon: '🛡️' },
  { id: 'helmet', name: 'Каска', rarity: 'common', staminaBonus: 10, damageBonus: 2, luckBonus: 0, costBullets: 40, icon: '⛑️' },
  { id: 'watch', name: 'Часы удачи', rarity: 'uncommon', staminaBonus: 0, damageBonus: 0, luckBonus: 50, costBullets: 60, icon: '⌚' },
  { id: 'boots', name: 'Берцы', rarity: 'common', staminaBonus: 8, damageBonus: 4, luckBonus: 10, costBullets: 55, icon: '👢' },
  // Редкие предметы из рейдов
  { id: 'tactical_vest', name: 'Тактический жилет', rarity: 'rare', staminaBonus: 35, damageBonus: 5, luckBonus: 0, costBullets: 200, icon: '🦺' },
  { id: 'sniper_scope', name: 'Прицел снайпера', rarity: 'rare', staminaBonus: 0, damageBonus: 25, luckBonus: 0, costBullets: 250, icon: '🔭' },
  { id: 'lucky_amulet', name: 'Амулет удачи', rarity: 'epic', staminaBonus: 15, damageBonus: 10, luckBonus: 120, costBullets: 500, icon: '📿' },
  { id: 'legendary_armor', name: 'Легендарная броня', rarity: 'legendary', staminaBonus: 60, damageBonus: 15, luckBonus: 80, costBullets: 1200, icon: '👑' },
];

// Крафтовые ресурсы
const RAW_MATERIALS: InventoryItem[] = [
  { id: 'scrap_metal', name: 'Металлолом', rarity: 'common', staminaBonus: 0, damageBonus: 0, luckBonus: 0, costBullets: 5, icon: '🔩' },
  { id: 'leather', name: 'Кожзаменитель', rarity: 'common', staminaBonus: 0, damageBonus: 0, luckBonus: 0, costBullets: 5, icon: '🧵' },
  { id: 'gun_parts', name: 'Части оружия', rarity: 'uncommon', staminaBonus: 0, damageBonus: 0, luckBonus: 0, costBullets: 15, icon: '🔧' },
  { id: 'explosives', name: 'Взрывчатка', rarity: 'uncommon', staminaBonus: 0, damageBonus: 0, luckBonus: 0, costBullets: 20, icon: '💥' },
  { id: 'med_components', name: 'Мед. компоненты', rarity: 'uncommon', staminaBonus: 0, damageBonus: 0, luckBonus: 0, costBullets: 18, icon: '💉' },
  { id: 'rare_crystal', name: 'Редкий кристалл', rarity: 'epic', staminaBonus: 0, damageBonus: 0, luckBonus: 0, costBullets: 80, icon: '💎' },
];

export const INVENTORY_ITEMS: InventoryItem[] = [...SHOP, ...RAW_MATERIALS];

export const CRAFTING_RECIPES = [
  {
    id: 'repair_kit',
    name: 'Набор для ремонта',
    resultItemId: 'gun_parts',
    resultCount: 3,
    cost: [
      { itemId: 'scrap_metal', count: 5 },
      { itemId: 'matches', count: 10 },
    ],
  },
  {
    id: 'mega_grenade',
    name: 'Мощная граната',
    resultItemId: 'grenade_mega',
    resultCount: 1,
    cost: [
      { itemId: 'explosives', count: 3 },
      { itemId: 'scrap_metal', count: 4 },
    ],
  },
  {
    id: 'tactical_vest_craft',
    name: 'Тактический жилет (крафт)',
    resultItemId: 'tactical_vest',
    resultCount: 1,
    cost: [
      { itemId: 'leather', count: 10 },
      { itemId: 'scrap_metal', count: 8 },
      { itemId: 'matches', count: 30 },
    ],
  },
  {
    id: 'sniper_scope_craft',
    name: 'Прицел снайпера (крафт)',
    resultItemId: 'sniper_scope',
    resultCount: 1,
    cost: [
      { itemId: 'gun_parts', count: 8 },
      { itemId: 'rare_crystal', count: 2 },
      { itemId: 'matches', count: 50 },
    ],
  },
  {
    id: 'medkit_bundle',
    name: 'Пак аптечек (×5)',
    resultItemId: 'medkit_bundle',
    resultCount: 5,
    cost: [
      { itemId: 'med_components', count: 5 },
      { itemId: 'matches', count: 15 },
    ],
  },
  {
    id: 'legendary_armor_craft',
    name: 'Легендарная броня (крафт)',
    resultItemId: 'legendary_armor',
    resultCount: 1,
    cost: [
      { itemId: 'rare_crystal', count: 5 },
      { itemId: 'gun_parts', count: 15 },
      { itemId: 'scrap_metal', count: 20 },
      { itemId: 'matches', count: 100 },
      { itemId: 'zhetons', count: 50 },
    ],
  },
];

export const DAILY_QUESTS: DailyQuest[] = [
  { id: 'q1', name: 'Первая кровь', description: 'Убейте босса', type: 'kill_boss', target: 1, rewardBullets: 15, rewardMatches: 5, rewardGrenades: 2, rewardGold: 1 },
  { id: 'q2', name: 'Разведчик', description: 'Выполните 3 задания в районе', type: 'do_task', target: 3, rewardBullets: 25, rewardMatches: 10, rewardGrenades: 3, rewardGold: 2 },
  { id: 'q3', name: 'Сборщик', description: 'Соберите ящики в рейде', type: 'raid_loot', target: 1, rewardBullets: 20, rewardMatches: 15, rewardGrenades: 5, rewardGold: 2 },
  { id: 'q4', name: 'Гонщик', description: 'Прокачайте машину', type: 'upgrade_car', target: 1, rewardBullets: 30, rewardMatches: 12, rewardGrenades: 3, rewardGold: 3 },
  { id: 'q5', name: 'Мастер', description: 'Скрафтите предмет', type: 'craft_item', target: 1, rewardBullets: 20, rewardMatches: 10, rewardGrenades: 4, rewardGold: 2 },
  { id: 'q6', name: 'Серийный убийца', description: 'Убейте 5 боссов', type: 'kill_boss', target: 5, rewardBullets: 60, rewardMatches: 25, rewardGrenades: 8, rewardGold: 5 },
  { id: 'q7', name: 'Трудолюбивый', description: 'Выполните 10 заданий', type: 'do_task', target: 10, rewardBullets: 80, rewardMatches: 40, rewardGrenades: 10, rewardGold: 7 },
  { id: 'q8', name: 'Аптекарь', description: 'Используйте 10 аптечек в бою', type: 'kill_boss', target: 10, rewardBullets: 40, rewardMatches: 15, rewardGrenades: 6, rewardGold: 3 },
];

export const TUTORIAL = [
  'Эргейт оцеплен стеной. Выживите и развивайтесь.',
  'Откройте профиль слева вверху — там внешность, уровень, выносливость и удача.',
  'Стартовое оружие и патроны выданы. Не тратьте энергию впустую.',
  'Качайте автомобиль первым: без него районы не откроются. Нортед — с 50 уровня машины.',
  'Мастерская справа внизу: заточка, модернизация и ремонт оружия. Максимум заточки — 10.',
  'Инвентарь (кнопка внизу) — новые предметы с редкостью. Крафт — создавайте лучшее снаряжение.',
  'Ежедневные квесты — выполняйте задания за бонусы. Не забывайте про рацию!',
];

export const DISTRICT_TASKS: Record<string, { id: string; name: string; icon: string; cost: number; bullets: number; matches: number }[]> = {
  southgate: [
    { id: 'sg1', name: 'Обход дворов', icon: '🏠', cost: 10, bullets: 8, matches: 3 },
    { id: 'sg2', name: 'Сбор ящиков', icon: '📦', cost: 12, bullets: 10, matches: 4 },
    { id: 'sg3', name: 'Зачистка улицы', icon: '🔫', cost: 15, bullets: 14, matches: 2 },
  ],
  westend: [
    { id: 'we1', name: 'Патруль', icon: '🚶', cost: 12, bullets: 10, matches: 4 },
    { id: 'we2', name: 'Обыск машин', icon: '🚗', cost: 14, bullets: 12, matches: 5 },
  ],
  market: [
    { id: 'mk1', name: 'Рынок', icon: '🛒', cost: 14, bullets: 12, matches: 6 },
    { id: 'mk2', name: 'Склады лавок', icon: '🏪', cost: 16, bullets: 16, matches: 5 },
  ],
  norted: [
    { id: 'nt1', name: 'Участок', icon: '👮', cost: 16, bullets: 18, matches: 6 },
    { id: 'nt2', name: 'Арсенал', icon: '🎯', cost: 18, bullets: 22, matches: 4 },
  ],
  industrial: [
    { id: 'in1', name: 'Цех', icon: '🏭', cost: 18, bullets: 20, matches: 8 },
    { id: 'in2', name: 'Ангар', icon: '🔧', cost: 22, bullets: 24, matches: 7 },
  ],
  docks: [
    { id: 'dk1', name: 'Контейнеры', icon: '📦', cost: 20, bullets: 25, matches: 10 },
    { id: 'dk2', name: 'Краны', icon: '🏗️', cost: 24, bullets: 30, matches: 8 },
  ],
  cathedral: [
    { id: 'ch1', name: 'Подвал собора', icon: '⛪', cost: 26, bullets: 35, matches: 12 },
    { id: 'ch2', name: 'Колокольня', icon: '🔔', cost: 30, bullets: 40, matches: 10 },
  ],
  mansion: [
    { id: 'ms1', name: 'Библиотека', icon: '📚', cost: 30, bullets: 45, matches: 14 },
    { id: 'ms2', name: 'Секретный кабинет', icon: '🗝️', cost: 35, bullets: 50, matches: 12 },
  ],
  military: [
    { id: 'ml1', name: 'Казармы', icon: '🏕️', cost: 35, bullets: 55, matches: 18 },
    { id: 'ml2', name: 'Арсенал', icon: '🎖️', cost: 40, bullets: 65, matches: 15 },
  ],
};
