import { SHOP_CLOTHING, SHOP_WEAPONS, clothingSlot } from './shopCatalog';
import { INVENTORY_SLOTS, INVENTORY_ITEMS, CRAFTING_RECIPES, DAILY_QUESTS, SHOP } from './constants';
import { msg, recordClanEvent } from './reducerShared';
import type { GameAction, GameState } from './types';

type InventoryAction = Extract<GameAction, { type: 'BUY_SHOP_ITEM' | 'EQUIP_SHOP_WEAPON' | 'BUY_EQUIPMENT' | 'EQUIP_ITEM' | 'UNEQUIP_ITEM' | 'CRAFT_ITEM' }>;

export const reduceInventory = (state: GameState, action: InventoryAction): GameState => {
  switch (action.type) {
    case 'BUY_SHOP_ITEM': {
      if (action.currency !== 'gold' && action.currency !== 'premium') return state;
      if (action.category !== 'weapon' && action.category !== 'clothing') return state;
      const weapon = action.category === 'weapon' ? SHOP_WEAPONS.find((entry) => entry.weapon.id === action.itemId) : undefined;
      const clothing = action.category === 'clothing' ? SHOP_CLOTHING.find((entry) => entry.item.id === action.itemId) : undefined;
      const entry = weapon ?? clothing;
      if (!entry) return state;
      if (weapon && (state.weapon.id === action.itemId || state.storedWeapons.some((w) => w.id === action.itemId))) return msg(state, 'Оружие уже куплено.');
      if (clothing && (state.inventory.some((slot) => slot.itemId === action.itemId) || state.equipmentIds.includes(action.itemId))) return msg(state, 'Предмет уже куплен.');
      if (clothing && state.inventory.length >= INVENTORY_SLOTS) return msg(state, 'Инвентарь заполнен.');
      const cost = entry.price[action.currency];
      const balance = action.currency === 'gold' ? state.gold : state.premiumGold;
      if (balance < cost) return msg(state, action.currency === 'gold' ? 'Не хватает игровых припасов.' : 'Не хватает премиум-золота.');
      const autoEquipCap = clothing?.item.id === 'shop_cap';
      const replacedHeadIds = autoEquipCap ? state.equipmentIds.filter((id) => clothingSlot(id) === 'head') : [];
      return {
        ...state,
        gold: state.gold - (action.currency === 'gold' ? cost : 0),
        premiumGold: state.premiumGold - (action.currency === 'premium' ? cost : 0),
        storedWeapons: weapon ? [...state.storedWeapons, { ...weapon.weapon, mods: [] }] : state.storedWeapons,
        inventory: clothing ? [...state.inventory.map((slot) => replacedHeadIds.includes(slot.itemId) ? { ...slot, equipped: false } : slot), { itemId: clothing.item.id, equipped: !!autoEquipCap }] : state.inventory,
        equipmentIds: autoEquipCap ? [...state.equipmentIds.filter((id) => !replacedHeadIds.includes(id)), clothing.item.id] : state.equipmentIds,
        lastMessage: `${weapon?.weapon.name ?? clothing?.item.name} куплен. ${weapon ? 'Выберите «Взять» в магазине.' : autoEquipCap ? 'Кепка надета.' : 'Наденьте предмет в магазине или инвентаре.'}`,
      };
    }
    case 'EQUIP_SHOP_WEAPON': {
      if (state.battle) return msg(state, 'Завершите бой перед сменой оружия.');
      const weapon = state.storedWeapons.find((item) => item.id === action.weaponId);
      if (!weapon) return state;
      return { ...state, weapon, storedWeapons: [...state.storedWeapons.filter((item) => item.id !== weapon.id), state.weapon], lastMessage: `Выбрано оружие: ${weapon.name}.` };
    }
    case 'BUY_EQUIPMENT': {
      if (state.equipmentIds.includes(action.itemId)) return msg(state, 'Уже надето.');
      const item = SHOP.find((s) => s.id === action.itemId);
      if (!item) return state;
      if (state.bullets < item.costBullets) return msg(state, `Нужно ${item.costBullets} патронов.`);
      return {
        ...state,
        bullets: state.bullets - item.costBullets,
        equipmentIds: [...state.equipmentIds, item.id],
        lastMessage: `${item.name} надето. Сравнивайте цену/бонус с прокачкой в профиле.`,
      };
    }
    case 'EQUIP_ITEM': {
      const slot = state.inventory[action.slotIndex];
      if (!slot) return state;
      const isEquipped = slot.equipped;
      if (isEquipped) {
        return {
          ...state,
          inventory: state.inventory.map((s, i) => (i === action.slotIndex ? { ...s, equipped: false } : s)),
          equipmentIds: state.equipmentIds.filter((id) => id !== slot.itemId),
          lastMessage: `Снято: ${INVENTORY_ITEMS.find((i) => i.id === slot.itemId)?.name ?? 'предмет'}.`,
        };
      }
      // Check if already equipped
      if (state.equipmentIds.includes(slot.itemId)) return msg(state, 'Уже надето.');
      // Один предмет на каждый слот одежды; прочая экипировка остаётся совместимой.
      const clothingType = clothingSlot(slot.itemId);
      const replacedIds = clothingType ? state.equipmentIds.filter((id) => clothingSlot(id) === clothingType) : [];
      return {
        ...state,
        inventory: state.inventory.map((s, i) => i === action.slotIndex ? { ...s, equipped: true } : replacedIds.includes(s.itemId) ? { ...s, equipped: false } : s),
        equipmentIds: [...state.equipmentIds.filter((id) => !replacedIds.includes(id)), slot.itemId],
        lastMessage: `Надето: ${INVENTORY_ITEMS.find((i) => i.id === slot.itemId)?.name ?? 'предмет'}.`,
      };
    }
    case 'UNEQUIP_ITEM': {
      const slot = state.inventory[action.slotIndex];
      if (!slot) return state;
      return {
        ...state,
        inventory: state.inventory.map((s, i) => (i === action.slotIndex ? { ...s, equipped: false } : s)),
        equipmentIds: state.equipmentIds.filter((id) => id !== slot.itemId),
        lastMessage: `Снято: ${INVENTORY_ITEMS.find((i) => i.id === slot.itemId)?.name ?? 'предмет'}.`,
      };
    }
    case 'CRAFT_ITEM': {
      const recipe = CRAFTING_RECIPES.find((r) => r.id === action.recipeId);
      if (!recipe) return state;
      // Check all costs
      for (const cost of recipe.cost) {
        if (cost.itemId === 'matches') {
          if (state.matches < cost.count) return msg(state, `Не хватает спичек для крафта.`);
        } else if (cost.itemId === 'zhetons') {
          if (state.zhetons < cost.count) return msg(state, `Не хватает жетонов для крафта.`);
        } else {
          const countInInventory = state.inventory.filter((s) => s.itemId === cost.itemId && !s.equipped).length;
          if (countInInventory < cost.count) return msg(state, `Не хватает ресурсов: ${cost.itemId}.`);
        }
      }
      // Deduct costs
      let next = {
        ...state,
        matches: state.matches - recipe.cost.filter((c) => c.itemId === 'matches').reduce((s, c) => s + c.count, 0),
        zhetons: state.zhetons - recipe.cost.filter((c) => c.itemId === 'zhetons').reduce((s, c) => s + c.count, 0),
      };
      // Remove raw materials
      for (const cost of recipe.cost) {
        if (cost.itemId === 'matches' || cost.itemId === 'zhetons') continue;
        let toRemove = cost.count;
        next = {
          ...next,
          inventory: next.inventory.reduce((acc, s) => {
            if (toRemove <= 0) return [...acc, s];
            if (s.itemId === cost.itemId && !s.equipped) {
              toRemove--;
              return acc;
            }
            return [...acc, s];
          }, [] as typeof next.inventory),
        };
      }
      // Аптечки попадают в боевые расходники, остальные изделия — в инвентарь.
      const isMedkitBundle = recipe.id === 'medkit_bundle';
      const craftedItem = INVENTORY_ITEMS.find((i) => i.id === recipe.resultItemId);
      if (!isMedkitBundle && !craftedItem) return msg(state, 'Ошибка крафта: результат не найден.');
      next = {
        ...next,
        medkits: next.medkits + (isMedkitBundle ? recipe.resultCount : 0),
        inventory: isMedkitBundle ? next.inventory : [
          ...next.inventory,
          ...Array.from({ length: recipe.resultCount }, () => ({ itemId: recipe.resultItemId, equipped: false })),
        ],
        craftingRecipes: [...next.craftingRecipes, recipe.id],
        lastMessage: `Скрафчено: ${recipe.name}!`,
      };
      // Update quest progress
      const craftQuest = next.daily.quests.find((qp) => qp.questId === 'q5');
      if (craftQuest && !craftQuest.completed && !craftQuest.claimed) {
        const quest = DAILY_QUESTS.find((q) => q.id === 'q5');
        const newProgress = Math.min(quest?.target ?? Infinity, craftQuest.progress + 1);
        next = {
          ...next,
          daily: {
            ...next.daily,
            quests: next.daily.quests.map((qp) =>
              qp.questId === 'q5' ? { ...qp, progress: newProgress, completed: newProgress >= (quest?.target ?? 0) } : qp
            ),
          },
        };
      }
      if (recipe.id === 'barricade') return recordClanEvent(next, 'barricade');
      if (isMedkitBundle) return recordClanEvent(next, 'medkit', recipe.resultCount);
      return next;
    }
  }
};
