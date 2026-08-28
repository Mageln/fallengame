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

export interface Weapon {
  name: string;
  level: number;
  broken: boolean;
  baseDamage: number;
  upgraded: boolean;
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
  source: 'district' | 'raid' | 'gast';
  shakeTimer: number;
  flashTimer: number;
  damageNumber: { value: number; x: number; y: number; crit: boolean } | null;
}

export interface RaidState {
  raidId: string;
  scouted: boolean;
  cratesLooted: boolean;
  pathClear: boolean;
}

export interface ClanState {
  name: string;
  score: number;
  members: number;
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
  carLevel: number;
  currentDistrict: string;
  currentLocation: string;
  unlockedDistricts: string[];
  weapon: Weapon;
  equipmentIds: string[];
  inventory: InventorySlot[];
  craftingRecipes: string[];
  clan: ClanState | null;
  daily: DailyState;
  gast: GastState;
  battle: BattleState | null;
  raid: RaidState | null;
  radioRequests: string[];
  lastMessage: string;
  soundEnabled: boolean;
  showMap: boolean;
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
  | { type: 'START_GAST' }
  | { type: 'BATTLE_ATTACK'; technique: boolean }
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
  | { type: 'CLAIM_DAILY' }
  | { type: 'CLAIM_QUEST_REWARD'; questId: string }
  | { type: 'EQUIP_ITEM'; slotIndex: number }
  | { type: 'UNEQUIP_ITEM'; slotIndex: number }
  | { type: 'CRAFT_ITEM'; recipeId: string }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'TOGGLE_MAP' }
  | { type: 'CHANGE_LOCATION'; locationId: string }
  | { type: 'CLEAR_MESSAGE' };
