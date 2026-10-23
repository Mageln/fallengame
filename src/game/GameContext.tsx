import { createContext, useContext, useEffect, useMemo, useReducer, ReactNode, useState, useRef } from 'react';
import { ENERGY_TICK_MS, INVENTORY_ITEMS } from './constants';
import { gameReducer, hydrateState } from './reducer';
import { createInitialState } from './initialState';
import { clanDirectoryKey, loadClanDirectory, loadStateSync, saveClanDirectory, saveState, setCurrentUserId } from './storage';
import { getVkUser, getVkUserId, VkUser } from '../services/vkApi';
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

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    () => hydrateState(createInitialState())
  );
  
  const [vkUser, setVkUser] = useState<VkUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hydratedRef = useRef(false);

  // Определение пользователя и загрузка ЕГО сохранения (у каждого свои ресурсы)
  useEffect(() => {
    const init = async () => {
      try {
        // Получаем VK ID пользователя (или мок в режиме разработки)
        const userId = await getVkUserId();
        
        // Устанавливаем ключ сохранения: ergate-save-{vkId}
        setCurrentUserId(userId);
        
        // Загружаем данные пользователя (имя, аватар)
        const user = await getVkUser();
        setVkUser(user);
        
        // Загружаем сохранение этого пользователя
        const saved = loadStateSync();
        const sharedClans = loadClanDirectory();
        const playerId = String(userId ?? user?.id ?? 'local');
        const playerName = user ? `${user.first_name} ${user.last_name}`.trim() : 'Выживший';
        hydratedRef.current = true;
        dispatch({
          type: 'HYDRATE_STATE',
          state: {
            ...(saved ?? createInitialState()),
            playerId,
            playerName,
            clanDirectory: sharedClans.length > 0 ? sharedClans : (saved?.clanDirectory ?? []),
          },
        });
      } catch (error) {
        console.error('Ошибка инициализации:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    init();
  }, []);

  // Сохранение состояния текущего пользователя
  // Пока идёт загрузка, не сохраняем — чтобы не затереть его сохранение стартовым состоянием
  useEffect(() => {
    if (isLoading) return;
    saveState(state);
  }, [state, isLoading]);

  useEffect(() => {
    if (!isLoading) saveClanDirectory(state.clanDirectory);
  }, [state.clanDirectory, isLoading]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === clanDirectoryKey) dispatch({ type: 'SYNC_CLANS', clans: loadClanDirectory() });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    // Генератор убежища ускоряет восстановление энергии вдвое.
    const interval = state.shelterGenerator ? ENERGY_TICK_MS / 2 : ENERGY_TICK_MS;
    const id = window.setInterval(() => dispatch({ type: 'RESTORE_ENERGY_TICK' }), interval);
    return () => window.clearInterval(id);
  }, [state.shelterGenerator]);

  // Бой живёт в состоянии игры и обновляется даже когда экран скрыт.
  useEffect(() => {
    const timer = window.setInterval(() => dispatch({ type: 'BOSS_TICK', now: Date.now() }), 1000);
    return () => window.clearInterval(timer);
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
