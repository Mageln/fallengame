import { BOSS_SKILLS, SKILL_DEFS } from './generated/game.js';

// A request is a command, never a state snapshot or a client-provided timestamp.
// Actions are admitted only after their reducer implementation has been reviewed.
const noArguments = new Set([
  'START_TUTORIAL', 'NEXT_TUTORIAL', 'SKIP_TUTORIAL', 'CLAIM_DAILY', 'CLAIM_LOGIN_REWARD',
  'CLAIM_DAILY_QUEST_BONUS', 'UPGRADE_LEVEL', 'UPGRADE_STAMINA', 'UPGRADE_LUCK',
  'UPGRADE_CAR', 'UPGRADE_WEAPON', 'UPGRADE_WEAPON_UPGRADE', 'REPAIR_WEAPON',
  'TOGGLE_SOUND', 'CLEAR_MESSAGE', 'TOGGLE_MAP', 'TOGGLE_BOSS_MODAL', 'TOGGLE_CLAN_MODAL',
  'TOGGLE_NOTIFICATIONS', 'CLEAR_NOTIFICATIONS',
  'CLOSE_ARENA_BATTLE', 'OPEN_BATTLE', 'BOSS_TICK', 'LEAVE_BATTLE', 'ABANDON_BOSS', 'CLAIM_ROOM',
  'RAID_SCOUT', 'RAID_BYPASS', 'RAID_LOOT', 'LEAVE_RAID', 'MINIMIZE_RAID',
  'CHECK_RAIDS', 'CLOSE_RAID_TASKS', 'START_GAST', 'BATTLE_POWER', 'BATTLE_COMBO',
  'BATTLE_BLOCK', 'BATTLE_EVADE', 'BATTLE_HEAL', 'LOTTERY', 'SEARCH_FRIEND',
  'RADIO_HELP', 'FORGE_ITEM', 'UNFORGE_ITEM',
]);
const idArguments: Record<string, string> = {
  ENTER_DISTRICT: 'districtId', DO_TASK: 'taskId',
  BUY_EQUIPMENT: 'itemId', EQUIP_SHOP_WEAPON: 'weaponId', CLAIM_QUEST_REWARD: 'questId',
  CRAFT_ITEM: 'recipeId', CHANGE_LOCATION: 'locationId',
  START_ARENA: 'opponentId', START_BOSS_FIGHT: 'bossId', BUY_BOSS_ATTACK: 'bossId',
  START_RAID: 'raidId', OPEN_MAP_RAID: 'raidId', CANCEL_RAID: 'raidId',
  CLAIM_RAID_REWARD: 'raidId', OPEN_RAID_TASKS: 'raidId', REMOVE_NOTIFICATION: 'id',
  START_BOSS: 'districtId', BUY_SHELTER_ITEM: 'itemId', BUY_SKIN: 'skinId', APPLY_SKIN: 'skinId',
};

export const parseProgressAction = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const action = value as Record<string, unknown>;
  if (typeof action.type !== 'string') return null;
  const keys = Object.keys(action).sort().join(',');
  if (keys === 'type' && noArguments.has(action.type)) return { type: action.type };
  if (keys === 'appearance,type' && action.type === 'SET_APPEARANCE' &&
      Number.isInteger(action.appearance) && Number(action.appearance) >= 0 && Number(action.appearance) <= 5) {
    return { type: action.type, appearance: action.appearance };
  }
  if ((action.type === 'BOSS_SKILL' || action.type === 'ARENA_SKILL') && keys === 'skillId,type' &&
      typeof action.skillId === 'string' && BOSS_SKILLS.some((skill) => skill.id === action.skillId)) {
    return { type: action.type, skillId: action.skillId };
  }
  if (action.type === 'UPGRADE_PROFILE_SKILL' && keys === 'skillId,type' &&
      typeof action.skillId === 'string' && SKILL_DEFS.some((skill) => skill.id === action.skillId)) {
    return { type: action.type, skillId: action.skillId };
  }
  const key = Object.prototype.hasOwnProperty.call(idArguments, action.type) ? idArguments[action.type] : undefined;
  if (key && keys === [key, 'type'].sort().join(',') && typeof action[key] === 'string' &&
      action[key].length > 0 && action[key].length <= 100) {
    return { type: action.type, [key]: action[key] };
  }
  if (action.type === 'BUY_SHOP_ITEM' && keys === 'category,currency,itemId,type' &&
      (action.category === 'weapon' || action.category === 'clothing') &&
      (action.currency === 'gold' || action.currency === 'premium') &&
      typeof action.itemId === 'string' && action.itemId.length > 0 && action.itemId.length <= 100) {
    return { type: action.type, category: action.category, currency: action.currency, itemId: action.itemId };
  }
  if (action.type === 'BATTLE_ATTACK' && keys === 'technique,type' && typeof action.technique === 'boolean') {
    return { type: action.type, technique: action.technique };
  }
  if (action.type === 'BATTLE_GRENADES' && keys === 'count,type' &&
      (action.count === 1 || action.count === 3 || action.count === 10 || action.count === 30)) {
    return { type: action.type, count: action.count };
  }
  if (action.type === 'COMPLETE_RAID_TASKS' && keys === 'mode,raidId,type' &&
      (action.mode === 'gold' || action.mode === 'energy') &&
      typeof action.raidId === 'string' && action.raidId.length > 0 && action.raidId.length <= 100) {
    return { type: action.type, raidId: action.raidId, mode: action.mode };
  }
  if ((action.type === 'EQUIP_ITEM' || action.type === 'UNEQUIP_ITEM') && keys === 'slotIndex,type' &&
      Number.isInteger(action.slotIndex) && Number(action.slotIndex) >= 0 && Number(action.slotIndex) < 100) {
    return { type: action.type, slotIndex: action.slotIndex };
  }
  return null;
};
