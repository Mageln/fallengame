export type AppearanceId = 0 | 1 | 2 | 3 | 4 | 5;

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9d9d9d',
  uncommon: '#1eff00',
  rare: '#0070ff',
  epic: '#a335ee',
  legendary: '#ff8000',
};

export const RARITY_NAMES: Record<Rarity, string> = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный',
};

export interface InventoryItem {
  id: string;
  name: string;
  rarity: Rarity;
  staminaBonus: number;
  damageBonus: number;
  luckBonus: number;
  costBullets: number;
  costMatches?: number; // для крафтовых предметов
  icon: string;
}

export interface InventorySlot {
  itemId: string;
  equipped: boolean;
  forged?: boolean;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  resultItemId: string;
  cost: { itemId: string; count: number }[];
}

export interface DailyQuest {
  id: string;
  name: string;
  description: string;
  type: 'kill_boss' | 'do_task' | 'raid_loot' | 'upgrade_car' | 'craft_item';
  target: number;
  rewardBullets: number;
  rewardMatches: number;
  rewardGrenades: number;
  rewardGold: number;
}

export interface DailyQuestProgress {
  questId: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

// ===== ОРУЖИЕ =====
export type WeaponType = 'melee' | 'firearm' | 'explosive' | 'improvised' | 'throwable';
export type AmmoType = 'none' | 'bullets' | 'grenades' | 'nails';

// Модификация оружия (заточка, прицел, глушитель...)
export interface WeaponMod {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  damageMul?: number; // множитель урона
  accuracyBonus?: number; // прибавка к точности
  critBonus?: number; // прибавка к крит. шансу
  durabilityMul?: number; // множитель максимальной прочности
  ammoPerShot?: number; // переопределяет расход боеприпаса
}

export interface Weapon {
  id: string;
  name: string;
  icon: string;
  type: WeaponType;
  rarity: Rarity;
  // --- боевые характеристики ---
  baseDamage: number;
  attackSpeed: number; // ударов за 10 ходов (влияет на шанс двойного удара)
  accuracy: number; // 0..1 базовая точность
  critChance: number; // 0..1 собственный крит. шанс оружия
  critDamage: number; // множитель крит. урона (2.0 = x2)
  range: number; // 1..6
  ammoType: AmmoType;
  ammoPerShot: number;
  // --- состояние ---
  durability: number;
  maxDurability: number;
  level: number; // 0..WEAPON_MAX_LEVEL
  upgraded: boolean; // «доведено до ума»
  broken: boolean;
  mods: WeaponMod[];
}

// ===== АТРИБУТЫ ПЕРСОНАЖА =====
export interface Stats {
  strength: number; // сила: урон, пробитие брони
  agility: number; // ловкость: точность, уклонение, контратака
  endurance: number; // выносливость: HP, регенерация энергии
  intellect: number; // интеллект: расход патронов, эффект аптечек
  // Дополнительный бонус к удаче. Основное значение удачи лежит в GameState.luck
  // (совместимость со старыми сохранениями), здесь — прибавка от новой системы статов.
  luck: number;
}

// ===== ЗОМБИ =====
// Полный состав зомби по гайдлайну: обычка, элита, боссы.
export type ZombieType =
  // обычные
  | 'walker' | 'runner' | 'crawler' | 'spitter' | 'feral'
  // элита
  | 'brute' | 'screamer' | 'toxic' | 'armored' | 'necro'
  // боссы
  | 'mother' | 'abomination' | 'butcher' | 'plague_bearer';

// Класс существа (не путать с Rarity предметов экипировки).
export type EnemyTier = 'common' | 'elite' | 'boss';

// Способность зомби (тег, а не функция — состояние должно оставаться сериализуемым)
export type ZombieAbility =
  | 'double_attack' // две атаки за ход раз в 3 хода
  | 'toxic_burst' // взрыв токсинов при смерти (AoE)
  | 'scream' // снижение точности игрока
  | 'poison' // отравление на несколько ходов
  | 'stun' // оглушение (пропуск хода)
  | 'regen' // регенерация HP каждый ход
  | 'split' // делится на мелких при смерти
  | 'summon' // призывает minions раз в N ходов
  | 'charge' // рывок: урон по всем + оглушение раз в N ходов
  | 'frenzy' // +50% скорости при HP < 30%
  | null;

export interface ZombieReward {
  xp: number;
  bullets: number;
  gold: number;
  matches: number;
  lootChance: number; // 0..1 шанс выпадения предмета
}

export interface Zombie {
  id: string;
  type: ZombieType;
  name: string;
  rarity: EnemyTier;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number; // атак за ход (1..3)
  armor: number;
  evasion: number; // 0..1
  weakness?: WeaponType[]; // типы оружия, против которых уязвим
  ability?: ZombieAbility;
  abilityCooldown?: number; // период способности в ходах (для summon/charge)
  reward: ZombieReward;
}

export type BattleSource = 'district' | 'boss' | 'gast';

export type BattleOutcome = 'fighting' | 'won' | 'lost';

export interface BattleReward {
  gold: number;
  bullets: number;
  zhetons: number;
  exp: number;
}

export interface BattleState {
  bossId: string;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  playerHp: number;
  playerMaxHp: number;
  log: string[];
  friends: string[];
  source: 'district' | 'raid' | 'gast' | 'boss';
  shakeTimer: number;
  flashTimer: number;
  damageNumber: { value: number; x: number; y: number; crit: boolean } | null;
  // ── пошаговая механика (Блок 2) ──
  turn: number; // номер хода, растёт после ответа босса
  turnLimit: number; // лимит ходов: за него бой считается проигранным
  comboStreak: number; // серия попаданий подряд (бонусы урона, слабых точек)
  blocking: boolean; // блок действует до следующего входящего удара
  evading: boolean; // уход в уклонение: следующий удар босса игнорируется + ответный
  cooldowns: {
    technique: number;
    power: number;
    combo: number;
    evade: number;
  };
  statuses: {
    poisonTurns: number;
    poisonDamage: number;
    stunTurns: number;
    aimDebuffTurns: number; // дебафф точности от крикунов
  };
  weakPointTurns: number; // открытая слабая точка (множитель WEAK_POINT_MUL)
  // Результат последнего действия игрока — нужен UI для точных цифр и крита
  lastHit: { damage: number; crit: boolean; missed: boolean } | null;
  // ── унификация боя (Этап 1) ──
  outcome: 'fighting' | 'won' | 'lost';
  startedAt: number; // Date.now() на старте — ключ владения наградой
  endedAt: number | null; // Date.now() на финале
  reward: { gold: number; bullets: number; keys: number; zhetons: number } | null; // показывается на экране победы
}

export interface RaidState {
  raidId: string;
  scouted: boolean;
  cratesLooted: boolean;
  pathClear: boolean;
}

export interface MapRaid {
  id: string;
  x: number; // координата X на карте (0-100%)
  y: number; // координата Y на карте (0-100%)
  type: 'yellow' | 'red'; // жёлтая (15 мин) или красная (30 мин) зона
  name: string;
  description: string;
  energyCost: number;
  rewards: {
    bullets: number;
    matches: number;
    materials: number;
  };
  isRunning: boolean;
  startTime?: number; // timestamp начала рейда
  endTime?: number; // timestamp окончания
  completed: boolean;
  notified?: boolean; // уведомление о завершении уже создано
}

export interface GameNotification {
  id: string;
  text: string;
  createdAt: number;
  read: boolean;
  raidId?: string;
}

// Кланы: войны (Блок 6)
export interface ClanState {
  name: string;
  score: number;
  members: number;
  // Клановые войны (ежедневные)
  warRating: number;
  warWins: number;
  warLosses: number;
  warStreak: number;
}

export interface ClanWarHistoryEntry {
  dateKey: string;
  enemyName: string;
  clanScore: number;
  enemyScore: number;
  win: boolean;
  gold: number;
  ratingDelta: number;
}

export interface ClanWarState {
  dateKey: string;
  enemyName: string;
  enemyRating: number;
  enemyScore: number;
  contributions: number;
  clanScore: number;
  claimed: boolean;
  streak: number;
}

export interface DailyState {
  dateKey: string;
  lotteryUsed: boolean;
  goldClaimed: boolean;
  quests: DailyQuestProgress[];
}

export interface GastState {
  weekKey: string;
  active: boolean;
  districtId: string | null;
}

export interface GameState {
  appearance: AppearanceId;
  tutorialStep: number;
  energy: number;
  maxEnergy: number;
  bullets: number;
  gold: number;
  zhetons: number;
  matches: number;
  grenades: number;
  medkits: number;
  keys: number;
  level: number;
  baseStamina: number;
  luck: number;
  // Базовые атрибуты персонажа (сила, ловкость, выносливость, интеллект, удача)
  attributes: Stats;
  carLevel: number;
  currentDistrict: string;
  currentLocation: string;
  unlockedDistricts: string[];
  weapon: Weapon;
  equipmentIds: string[];
  inventory: InventorySlot[];
  craftingRecipes: string[];
  clan: ClanState | null;
  clanRating: number;
  clanWar: ClanWarState | null;
  clanWarHistory: ClanWarHistoryEntry[];
  daily: DailyState;
  gast: GastState;
  battle: BattleState | null;
  raid: RaidState | null;
  radioRequests: string[];
  lastMessage: string;
  soundEnabled: boolean;
  showMap: boolean;
  showBossModal: boolean;
  showRaidModal: boolean;
  showClanModal: boolean;
  // id рейда, окно которого сейчас открыто (рейд при этом может идти в фоне)
  activeRaidId: string | null;
  mapRaids: MapRaid[];
  notifications: GameNotification[];
  showNotifications: boolean;
}

export type GameAction =
  | { type: 'SET_APPEARANCE'; appearance: AppearanceId }
  | { type: 'NEXT_TUTORIAL' }
  | { type: 'SKIP_TUTORIAL' }
  | { type: 'RESTORE_ENERGY_TICK' }
  | { type: 'UPGRADE_LEVEL' }
  | { type: 'UPGRADE_STAMINA' }
  | { type: 'UPGRADE_LUCK' }
  | { type: 'UPGRADE_CAR' }
  | { type: 'ENTER_DISTRICT'; districtId: string }
  | { type: 'DO_TASK'; taskId: string }
  | { type: 'BUY_EQUIPMENT'; itemId: string }
  | { type: 'UPGRADE_WEAPON' }
  | { type: 'UPGRADE_WEAPON_UPGRADE' }
  | { type: 'REPAIR_WEAPON' }
  | { type: 'START_BOSS'; districtId: string }
  | { type: 'START_BOSS_FIGHT'; bossId: string }
  | { type: 'START_GAST' }
  | { type: 'BATTLE_ATTACK'; technique: boolean }
  | { type: 'BATTLE_POWER' }
  | { type: 'BATTLE_COMBO' }
  | { type: 'BATTLE_BLOCK' }
  | { type: 'BATTLE_EVADE' }
  | { type: 'BATTLE_GRENADES'; count: 1 | 3 | 10 | 30 }
  | { type: 'BATTLE_HEAL' }
  | { type: 'INVITE_FRIEND' }
  | { type: 'LEAVE_BATTLE' }
  | { type: 'START_RAID'; raidId: string }
  | { type: 'RAID_SCOUT' }
  | { type: 'RAID_BYPASS' }
  | { type: 'RAID_LOOT' }
  | { type: 'LEAVE_RAID' }
  | { type: 'LOTTERY' }
  | { type: 'SEARCH_FRIEND' }
  | { type: 'RADIO_HELP' }
  | { type: 'JOIN_CLAN' }
  | { type: 'CREATE_CLAN'; name: string }
  | { type: 'CLAN_WAR_CONTRIBUTE' }
  | { type: 'CLAN_WAR_CLAIM' }
  | { type: 'FORGE_ITEM' }
  | { type: 'UNFORGE_ITEM' }
  | { type: 'CLAIM_DAILY' }
  | { type: 'CLAIM_QUEST_REWARD'; questId: string }
  | { type: 'EQUIP_ITEM'; slotIndex: number }
  | { type: 'UNEQUIP_ITEM'; slotIndex: number }
  | { type: 'CRAFT_ITEM'; recipeId: string }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'TOGGLE_MAP' }
  | { type: 'TOGGLE_BOSS_MODAL' }
  | { type: 'TOGGLE_CLAN_MODAL' }
  | { type: 'CANCEL_RAID'; raidId: string }
  | { type: 'MINIMIZE_RAID' }
  | { type: 'CHECK_RAIDS' }
  | { type: 'TOGGLE_NOTIFICATIONS' }
  | { type: 'REMOVE_NOTIFICATION'; id: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'CLAIM_RAID_REWARD'; raidId: string }
  | { type: 'CHANGE_LOCATION'; locationId: string }
  | { type: 'HYDRATE_STATE'; state: GameState }
  | { type: 'ADD_RESOURCE'; resource: 'energy' | 'bullets' | 'gold' | 'matches' | 'zhetons'; amount: number }
  | { type: 'CLEAR_MESSAGE' };
