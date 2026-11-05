// A request is a command, never a state snapshot or a client-provided timestamp.
// Actions are admitted only after their reducer implementation has been reviewed.
const noArguments = new Set([
  'NEXT_TUTORIAL', 'SKIP_TUTORIAL', 'CLAIM_DAILY', 'CLAIM_LOGIN_REWARD',
  'CLAIM_DAILY_QUEST_BONUS', 'UPGRADE_LEVEL', 'UPGRADE_STAMINA', 'UPGRADE_LUCK',
  'UPGRADE_CAR', 'UPGRADE_WEAPON', 'UPGRADE_WEAPON_UPGRADE', 'REPAIR_WEAPON',
  'TOGGLE_SOUND', 'CLEAR_MESSAGE', 'TOGGLE_MAP', 'TOGGLE_BOSS_MODAL', 'TOGGLE_CLAN_MODAL',
  'TOGGLE_NOTIFICATIONS', 'CLEAR_NOTIFICATIONS',
]);
const idArguments: Record<string, string> = {
  UPGRADE_PROFILE_SKILL: 'skillId', ENTER_DISTRICT: 'districtId', DO_TASK: 'taskId',
  BUY_EQUIPMENT: 'itemId', EQUIP_SHOP_WEAPON: 'weaponId', CLAIM_QUEST_REWARD: 'questId',
  CRAFT_ITEM: 'recipeId', CHANGE_LOCATION: 'locationId',
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
  if ((action.type === 'EQUIP_ITEM' || action.type === 'UNEQUIP_ITEM') && keys === 'slotIndex,type' &&
      Number.isInteger(action.slotIndex) && Number(action.slotIndex) >= 0 && Number(action.slotIndex) < 100) {
    return { type: action.type, slotIndex: action.slotIndex };
  }
  return null;
};
