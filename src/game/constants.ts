import { InventoryItem, DailyQuest, Rarity, Weapon, WeaponMod, WeaponType, Zombie } from './types';

export const WEAPON_MAX_LEVEL = 10;
export const WEAPON_DAMAGE_PER_LEVEL = 3;
export const WEAPON_BREAK_CHANCE = 0.18;
export const CLAN_JOIN_LEVEL = 20;
export const CLAN_CREATE_LEVEL = 25;
export const CLAN_CREATE_GOLD = 2500;
export const CLAN_MAX_MEMBERS = 300;

// Кланы: войны (Блок 6)
export const CLAN_WAR_MAX_ALLIES = 3;
export const CLAN_WAR_ALLY_POWER_MIN = 0.3;
export const CLAN_WAR_ALLY_POWER_MAX = 0.8;
export const CLAN_WAR_PRESTIGE_WIN = 10;
export const CLAN_WAR_PRESTIGE_LOSS = 3;
export const CLAN_WAR_POWER_PER_LEVEL = 12;
export const CLAN_WAR_POWER_BASE = 60;

// Ежедневные клановые войны
export const CLAN_WAR_MIN_CONTRIB = 10;
export const CLAN_WAR_FULL_CONTRIB = 60;
export const CLAN_WAR_GOLD_BASE = 150;
export const CLAN_WAR_GOLD_LOSS = 40;
export const CLAN_WAR_CONTRIB_COST = 1;
export const CLAN_WAR_CONTRIB_SCORE = 3;
export const CLAN_WAR_HISTORY_LIMIT = 14;

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

export const LOCATIONS = [
  { id: 'location1', name: 'Казармы', bg: 'room1.jpg', character: 'pers1.png' },
  { id: 'location2', name: 'Больница', bg: 'room2.jpg', character: 'pers1.png' },
  { id: 'location3', name: 'Склад', bg: 'room3.jpg', character: 'pers1.png' },
  { id: 'location4', name: 'Лаборатория', bg: 'room4.jpg', character: 'pers1.png' },
  { id: 'location5', name: 'Бункер', bg: 'room5.jpg', character: 'pers1.png' },
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
  { id: 'barricade', name: 'Баррикада', rarity: 'common', staminaBonus: 0, damageBonus: 0, luckBonus: 0, costBullets: 0, icon: '🧱' },
];

export const INVENTORY_ITEMS: InventoryItem[] = [...SHOP, ...RAW_MATERIALS];

export const CRAFTING_RECIPES = [
  {
    id: 'barricade',
    name: 'Баррикада убежища',
    resultItemId: 'barricade',
    resultCount: 1,
    cost: [
      { itemId: 'scrap_metal', count: 12 },
      { itemId: 'matches', count: 20 },
    ],
  },
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

// ── Боевая система (Блок 2) ──────────────────────────────────────────────────

// Потеря прочности за одно действие по типу оружия.
export const DURABILITY_LOSS_BY_TYPE: Record<WeaponType, number> = {
  melee: 2,
  firearm: 1,
  explosive: 3,
  improvised: 2,
  throwable: 1,
};

// Точный приём: +35% урона (как в старой версии боя), но с кулдауном.
export const TECHNIQUE_MUL = 1.35;
export const TECHNIQUE_COOLDOWN = 3;

// Мощный удар: пробивает половину брони, долгий кулдаун.
export const POWER_MUL = 1.6;
export const POWER_PIERCE = 0.5;
export const POWER_COOLDOWN = 5;

// Серия: три удара по 70% урона (суммарно больше, но рискованно из-за промахов).
export const COMBO_HITS = 3;
export const COMBO_HIT_MUL = 0.7;
export const COMBO_COOLDOWN = 4;

// Защита.
export const BLOCK_REDUCTION = 0.4; // входящий урон x0.4 при блоке
export const BLOCK_COUNTER_CHANCE = 0.35; // шанс контратаки из блока
export const BLOCK_COUNTER_MUL = 0.8;
export const EVADE_COUNTER_MUL = 0.5; // ответный удар после уклонения
export const BLOCK_COOLDOWN = 2; // блок нельзя ставить чаще
export const EVADE_COOLDOWN = 2; // уклонение — тоже с перезарядкой
export const BLOCK_HEAL = 0.1; // успешный блок немного лечит (от макс. HP)
export const EVADE_BONUS = 0.35; // прибавка к шансу уклонения на подготовленном ходу

// Комбо-бонусы за серию попаданий подряд.
export const COMBO_STREAK_TIERS: { min: number; mul: number }[] = [
  { min: 8, mul: 1.3 },
  { min: 5, mul: 1.2 },
  { min: 3, mul: 1.1 },
];
export const GUARANTEED_CRIT_STREAK = 10;
export const WEAK_POINT_STREAK = 5; // серия → открытая слабая точка
export const WEAK_POINT_MUL = 1.75;
export const WEAK_POINT_TURNS = 1;

// Урон без боеприпасов: бьём прикладом/рукоятью.
export const DRY_FIRE_MUL = 0.35;

// Лимит ходов боя по его источнику.
export const TURN_LIMIT: Record<'district' | 'raid' | 'gast' | 'boss', number> = {
  district: 20,
  raid: 30,
  gast: 40,
  boss: 40,
};

// Фаза ярости босса и статусы.
export const ENRAGE_THRESHOLD = 0.25;
export const ENRAGE_MUL = 1.5;
export const STUN_CHANCE = 0.18; // шанс оглушения в ярости
export const POISON_CHANCE = 0.22; // шанс яда в ярости
export const POISON_TURNS = 3;
export const POISON_DAMAGE = 5;

// ── Оружие и существа (Блок 1) ────────────────────────────────────────────────

// Множители по редкости: базовый урон оружия умножается на damageMul,
// число слотов под обвесы — modSlots, запас прочности — durability.
export const RARITY_TABLE: Record<Rarity, { damageMul: number; modSlots: number; durability: number }> = {
  common: { damageMul: 1.0, modSlots: 1, durability: 60 },
  uncommon: { damageMul: 1.15, modSlots: 1, durability: 90 },
  rare: { damageMul: 1.35, modSlots: 2, durability: 130 },
  epic: { damageMul: 1.6, modSlots: 3, durability: 180 },
  legendary: { damageMul: 2.0, modSlots: 3, durability: 240 },
};

// Обвесы (модификации). Ставятся в свободные слоты оружия.
export const WEAPON_MODS: WeaponMod[] = [
  { id: 'sharpening', name: 'Заточка', description: '+10% урона', rarity: 'common', damageMul: 1.1 },
  { id: 'lead_padding', name: 'Свинцовая набивка', description: '+18% урона', rarity: 'uncommon', damageMul: 1.18 },
  { id: 'suppressor', name: 'Глушитель', description: '+6% точности', rarity: 'rare', accuracyBonus: 0.06 },
  { id: 'optic_scope', name: 'Оптический прицел', description: '+10% точности', rarity: 'epic', accuracyBonus: 0.1 },
  { id: 'weighted_grip', name: 'Обвес-рукоять', description: '+5% шанса крита', rarity: 'rare', critBonus: 0.05 },
  { id: 'welding', name: 'Кустарная сварка', description: '+50% прочности', rarity: 'uncommon', durabilityMul: 1.5 },
];

export const getWeaponMod = (id: string): WeaponMod | undefined =>
  WEAPON_MODS.find((m) => m.id === id);

// Каталог оружия. Поля durability/maxDurability — эталонные (полные);
// при выдаче конкретного экземпляра durability можно уменьшить.
const mkWeapon = (
  id: string, name: string, icon: string, type: Weapon['type'], rarity: Rarity,
  baseDamage: number, attackSpeed: number, accuracy: number, critChance: number,
  critDamage: number, range: number, ammoType: Weapon['ammoType'], ammoPerShot: number,
  durability: number
): Weapon => ({
  id, name, icon, type, rarity, baseDamage, attackSpeed, accuracy, critChance, critDamage,
  range, ammoType, ammoPerShot, durability, maxDurability: durability,
  level: 0, upgraded: false, broken: false, mods: [],
});

export const WEAPONS: Weapon[] = [
  mkWeapon('rusty_pistol', 'Ржавый пистолет', '🔫', 'firearm', 'common', 6, 5, 0.75, 0.05, 1.8, 3, 'bullets', 1, 60),
  mkWeapon('rusty_crowbar', 'Ржавый лом', '🔧', 'melee', 'common', 6, 7, 0.8, 0.05, 1.8, 1, 'none', 0, 70),
  mkWeapon('butcher_cleaver', 'Тесак мясника', '🪓', 'melee', 'common', 9, 8, 0.82, 0.08, 1.9, 1, 'none', 0, 60),
  mkWeapon('nailed_bat', 'Бита с гвоздями', '🏏', 'melee', 'uncommon', 12, 6, 0.78, 0.1, 2.0, 1, 'none', 0, 90),
  mkWeapon('fireman_axe', 'Топор пожарного', '🪓', 'melee', 'rare', 18, 5, 0.75, 0.12, 2.2, 1, 'none', 0, 130),
  mkWeapon('urban_machete', 'Мачете «Городской стриж»', '🗡️', 'melee', 'rare', 16, 9, 0.88, 0.15, 2.1, 1, 'none', 0, 110),
  mkWeapon('cold_dawn_katana', 'Катана «Холодный рассвет»', '⚔️', 'melee', 'epic', 26, 9, 0.9, 0.2, 2.4, 1, 'none', 0, 170),
  mkWeapon('sawed_off', 'Обрез «Двустволка»', '💥', 'firearm', 'uncommon', 22, 3, 0.7, 0.1, 2.0, 2, 'bullets', 2, 80),
  mkWeapon('ppsh_violin', 'ППШ «Скрипка»', '🎻', 'firearm', 'rare', 14, 9, 0.72, 0.09, 1.9, 3, 'bullets', 1, 120),
  mkWeapon('akm_veteran', 'АКМ «Ветеран»', '🔫', 'firearm', 'epic', 24, 7, 0.8, 0.14, 2.2, 4, 'bullets', 1, 160),
  mkWeapon('mosin_quiet', 'Карабин Мосина «Тихий гость»', '🎯', 'firearm', 'rare', 30, 2, 0.95, 0.25, 2.6, 6, 'bullets', 1, 100),
  mkWeapon('nail_launcher', 'Самопал «Гвоздёмёт»', '🔩', 'improvised', 'common', 13, 4, 0.6, 0.06, 1.7, 2, 'nails', 1, 40),
  mkWeapon('pipe_shotgun', 'Дробовик из трубы «Сосед»', '🪈', 'improvised', 'uncommon', 19, 3, 0.62, 0.08, 1.8, 2, 'bullets', 1, 55),
  mkWeapon('cleaner_flamer', 'Огнемёт «Чистильщик»', '🔥', 'explosive', 'epic', 20, 4, 0.85, 0.1, 2.0, 3, 'grenades', 1, 140),
  mkWeapon('molotov', 'Коктейль Молотова', '🍾', 'throwable', 'rare', 28, 1, 0.9, 0, 1.0, 4, 'none', 0, 1),
  mkWeapon('hedgehog_grenade', 'Граната «Ёжик»', '💣', 'throwable', 'epic', 45, 1, 0.95, 0, 1.0, 3, 'none', 0, 1),
];

export const getWeapon = (id: string): Weapon | undefined => WEAPONS.find((w) => w.id === id);

// Стартовое оружие нового игрока.
export const STARTER_WEAPON: Weapon = {
  ...getWeapon('rusty_pistol')!,
};

// Стартовые характеристики героя.
export const DEFAULT_STATS = {
  strength: 5,
  agility: 5,
  endurance: 5,
  intellect: 3,
  luck: 0,
};

// Каталог зомби (Блок 3). Поля hp/damage — базовые для 1 уровня района,
// масштабируются scaleZombie() при спавне.
const mkZombie = (
  id: string, name: string, type: Zombie['type'], rarity: Zombie['rarity'],
  hp: number, damage: number, speed: number, armor: number, evasion: number,
  weakness: Weapon['type'][] | undefined, ability: Zombie['ability'],
  abilityCooldown: number | undefined, reward: Zombie['reward']
): Zombie => ({
  id, name, type, rarity, hp, maxHp: hp, damage, speed, armor, evasion,
  weakness, ability, abilityCooldown, reward,
});

export const ZOMBIES: Zombie[] = [
  // ── Обычные ──
  mkZombie('walker', 'Бродяга', 'walker', 'common', 30, 6, 1, 0, 0.02, undefined, null, undefined, { xp: 8, bullets: 1, gold: 0, matches: 1, lootChance: 0.1 }),
  mkZombie('runner', 'Бегун', 'runner', 'common', 22, 9, 2, 0, 0.15, undefined, 'double_attack', 3, { xp: 12, bullets: 2, gold: 0, matches: 1, lootChance: 0.15 }),
  mkZombie('crawler', 'Ползун', 'crawler', 'common', 18, 11, 1, 0, 0.05, ['melee'], 'poison', 4, { xp: 10, bullets: 1, gold: 0, matches: 2, lootChance: 0.12 }),
  mkZombie('spitter', 'Плевун', 'spitter', 'common', 26, 12, 1, 0, 0.05, undefined, 'poison', 2, { xp: 14, bullets: 2, gold: 0, matches: 2, lootChance: 0.18 }),
  mkZombie('feral', 'Дикун', 'feral', 'common', 28, 10, 2, 0, 0.1, ['melee'], 'double_attack', 2, { xp: 13, bullets: 2, gold: 0, matches: 1, lootChance: 0.15 }),
  // ── Элита ──
  mkZombie('brute', 'Громила', 'brute', 'elite', 70, 14, 1, 6, 0.0, ['explosive'], 'toxic_burst', undefined, { xp: 25, bullets: 4, gold: 1, matches: 3, lootChance: 0.35 }),
  mkZombie('screamer', 'Крикун', 'screamer', 'elite', 26, 4, 2, 0, 0.08, ['firearm'], 'summon', 3, { xp: 14, bullets: 2, gold: 0, matches: 2, lootChance: 0.15 }),
  mkZombie('toxic', 'Токсичный', 'toxic', 'elite', 40, 8, 2, 2, 0.05, ['firearm'], 'poison', 2, { xp: 20, bullets: 3, gold: 0, matches: 2, lootChance: 0.25 }),
  mkZombie('armored', 'Бронированный', 'armored', 'elite', 90, 12, 1, 14, 0.0, ['explosive'], 'regen', 4, { xp: 35, bullets: 5, gold: 1, matches: 4, lootChance: 0.45 }),
  mkZombie('necro', 'Мёртвяк', 'necro', 'elite', 55, 10, 1, 3, 0.1, ['melee'], 'summon', 2, { xp: 30, bullets: 4, gold: 1, matches: 3, lootChance: 0.4 }),
  // ── Боссы ──
  mkZombie('mother', 'Матка', 'mother', 'boss', 500, 18, 1, 8, 0.0, ['explosive'], 'summon', 2, { xp: 200, bullets: 30, gold: 50, matches: 20, lootChance: 1 }),
  mkZombie('abomination', 'Гибрид', 'abomination', 'boss', 800, 25, 1, 12, 0.05, ['explosive'], 'toxic_burst', undefined, { xp: 320, bullets: 45, gold: 80, matches: 30, lootChance: 1 }),
  mkZombie('butcher', 'Мясник', 'butcher', 'boss', 650, 30, 2, 10, 0.1, ['firearm'], 'charge', 3, { xp: 280, bullets: 40, gold: 70, matches: 25, lootChance: 1 }),
  mkZombie('plague_bearer', 'Заразитель', 'plague_bearer', 'boss', 720, 22, 1, 10, 0.08, ['firearm'], 'frenzy', undefined, { xp: 300, bullets: 42, gold: 75, matches: 28, lootChance: 1 }),
];

export const getZombie = (id: string): Zombie | undefined => ZOMBIES.find((z) => z.id === id);

// Скалирование зомби под уровень района и уровень игрока.
export const scaleZombie = (base: Zombie, districtCarLevel: number, playerLevel: number): Zombie => {
  const hpMul = 1 + districtCarLevel / 150 + playerLevel / 200;
  const dmgMul = 1 + districtCarLevel / 300;
  const hp = Math.round(base.hp * hpMul);
  return {
    ...base,
    hp,
    maxHp: hp,
    damage: Math.round(base.damage * dmgMul),
  };
};

// Собирает полноценное оружие из старого сохранённого объекта,
// заполняя новые поля значениями по умолчанию (для миграции сохранений).
export const normalizeWeapon = (w: Partial<Weapon>): Weapon => {
  const rarity: Rarity = w.rarity ?? 'common';
  const base = RARITY_TABLE[rarity];
  const maxDurability = w.maxDurability ?? base.durability;
  return {
    id: w.id ?? 'rusty_pistol',
    name: w.name ?? 'Ржавый пистолет',
    icon: w.icon ?? '🔫',
    type: w.type ?? 'firearm',
    rarity,
    baseDamage: w.baseDamage ?? 6,
    attackSpeed: w.attackSpeed ?? 5,
    accuracy: w.accuracy ?? 0.75,
    critChance: w.critChance ?? 0.05,
    critDamage: w.critDamage ?? 1.8,
    range: w.range ?? 3,
    ammoType: w.ammoType ?? 'bullets',
    ammoPerShot: w.ammoPerShot ?? 1,
    durability: w.durability ?? maxDurability,
    maxDurability,
    level: w.level ?? 0,
    upgraded: w.upgraded ?? false,
    broken: w.broken ?? false,
    mods: Array.isArray(w.mods) ? w.mods : [],
  };
};
