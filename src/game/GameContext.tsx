import { createContext, useContext, useEffect, useMemo, useReducer, ReactNode, useState, useCallback } from 'react';
import { ENERGY_TICK_MS, INVENTORY_ITEMS } from './constants';
import { gameReducer, hydrateState } from './reducer';
import { createInitialState } from './initialState';
import { loadState, saveState } from './storage';
import { getVkUser, VkUser } from '../services/vkApi';
import { DailyQuestProgress, GameAction, GameState } from './types';
import {
  critChance,
  totalDamage,
  totalLuck,
  totalStamina,
  weaponDamage,
} from './formulas';

interface DerivedState {
  stamina: number;
  luck: number;
  damage: number;
  weaponDmg: number;
  crit: number;
  equippedItems: { id: string; name: string; rarity: string }[];
  inventoryCount: number;
  completedQuests: number;
  claimedQuests: number;
}

interface GameContextValue {
  state: GameState;
  dispatch: (action: GameAction) => void;
  derived: DerivedState;
  vkUser: VkUser | null;
  isLoading: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

// Синхронная версия loadState для инициализации
const loadStateSync = (): GameState | null => {
  try {
    const raw = localStorage.getItem('ergate-save-v1');
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return {
      ...s,
      showBossModal: false,
      showMap: false,
      showRaidModal: false,
      activeRaid: null,
    };
  } catch {
    return null;
  }
};

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(
    gameReducer,
    createInitialState(),
    (base) => hydrateState(loadStateSync() ?? base)
  );
  
  const [vkUser, setVkUser] = useState<VkUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Загрузка данных VK пользователя и сохранённой игры
  useEffect(() => {
    const init = async () => {
      try {
        // Получаем данные VK пользователя
        const user = await getVkUser();
        setVkUser(user);
        
        // Загружаем сохранение с VK ID
        const savedState = await loadState();
        if (savedState) {
          // Обновляем state через dispatch
          Object.entries(savedState).forEach(([key, value]) => {
            // Применяем сохранённые данные
          });
        }
      } catch (error) {
        console.error('Ошибка инициализации:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    init();
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: 'RESTORE_ENERGY_TICK' }), ENERGY_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      dispatch,
      derived: {
        stamina: totalStamina(state),
        luck: totalLuck(state),
        damage: totalDamage(state),
        weaponDmg: weaponDamage(state),
        crit: critChance(state),
        equippedItems: (state.equipmentIds || []).map((id) => {
          const item = INVENTORY_ITEMS.find((i) => i.id === id);
          return item ? { id: item.id, name: item.name, rarity: item.rarity } : null;
        }).filter(Boolean) as any,
        inventoryCount: (state.inventory || []).length,
        completedQuests: (state.daily?.quests || []).filter((q: DailyQuestProgress) => q.completed && !q.claimed).length,
        claimedQuests: (state.daily?.quests || []).filter((q: DailyQuestProgress) => q.claimed).length,
      },
      vkUser,
      isLoading,
    }),
    [state, vkUser, isLoading]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame вне GameProvider');
  }
  return ctx;
};
