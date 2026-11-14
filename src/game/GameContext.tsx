import { createContext, useContext, useEffect, useMemo, useReducer, ReactNode, useState, useRef, useCallback } from 'react';
import { ENERGY_TICK_MS, INVENTORY_ITEMS } from './constants';
import { gameReducer, hydrateState } from './reducer';
import { createInitialState } from './initialState';
import { clanDirectoryKey, loadClanDirectory, loadStateSync, saveClanDirectory, saveState, setCurrentUserId } from './storage';
import { getVkUser, getVkUserId, VkUser } from '../services/vkApi';
import { DailyQuestProgress, GameAction, GameState } from './types';
import { BACKEND_URL } from '../config/vkConfig';
import { createServerProgress, ProgressError } from './serverProgress';
import { getStaffRole, type StaffRole } from '../services/moderation';
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
  staffRole: StaffRole;
  serverMode: boolean;
}

const serverMode = import.meta.env.VITE_SERVER_PROGRESS === 'true';

export const GameContext = createContext<GameContextValue | null>(null);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatchLocal] = useReducer(
    (current: GameState, action: GameAction) => serverMode && action.type === 'HYDRATE_STATE' ? action.state : gameReducer(current, action),
    undefined,
    () => hydrateState(createInitialState())
  );
  
  const [vkUser, setVkUser] = useState<VkUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hydratedRef = useRef(false);
  const [serverError, setServerError] = useState('');
  const [serverReady, setServerReady] = useState(false);
  const [staffRole, setStaffRole] = useState<StaffRole>('player');
  useEffect(() => {
    if (!serverMode || !serverReady) { setStaffRole('player'); return; }
    let active = true;
    getStaffRole().then((role) => { if (active) setStaffRole(role); }).catch(() => { if (active) setStaffRole('player'); });
    return () => { active = false; };
  }, [serverReady]);
  const server = useRef(createServerProgress(BACKEND_URL, window.location.search));

  const loadServer = useCallback(async () => {
    setIsLoading(true);
    setServerReady(false);
    setServerError('');
    try {
      const saved = await server.current.load();
      dispatchLocal({ type: 'HYDRATE_STATE', state: saved });
      setServerReady(true);
    } catch (error) {
      setServerReady(false);
      setServerError(error instanceof Error ? error.message : 'Не удалось загрузить прогресс.');
    } finally { setIsLoading(false); }
  }, []);

  const dispatch = useCallback((action: GameAction) => {
    if (!serverMode) { dispatchLocal(action); return; }
    // These client timers and synchronization hooks must never grant resources.
    if (['RESTORE_ENERGY_TICK', 'SYNC_CLANS'].includes(action.type)) return;
    void server.current.act(action).then((saved) => {
      dispatchLocal({ type: 'HYDRATE_STATE', state: saved });
    }).catch((error: unknown) => {
      setServerError(error instanceof Error ? error.message : 'Не удалось выполнить действие.');
      if (error instanceof ProgressError && error.status === 403) setServerReady(false);
    });
  }, []);

  // Определение пользователя и загрузка ЕГО сохранения (у каждого свои ресурсы)
  useEffect(() => {
    const init = async () => {
      if (serverMode) {
        const user = await getVkUser().catch(() => null);
        setVkUser(user);
        await loadServer();
        return;
      }
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
        dispatchLocal({
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
  }, [loadServer]);

  // Сохранение состояния текущего пользователя
  // Пока идёт загрузка, не сохраняем — чтобы не затереть его сохранение стартовым состоянием
  useEffect(() => {
    if (isLoading || serverMode) return;
    saveState(state);
  }, [state, isLoading]);

  useEffect(() => {
    if (!isLoading && !serverMode) saveClanDirectory(state.clanDirectory);
  }, [state.clanDirectory, isLoading]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === clanDirectoryKey) dispatch({ type: 'SYNC_CLANS', clans: loadClanDirectory() });
    };
    if (serverMode) return;
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [dispatch]);

  useEffect(() => {
    if (serverMode) return;
    // Генератор убежища ускоряет восстановление энергии вдвое.
    const interval = state.shelterGenerator ? ENERGY_TICK_MS / 2 : ENERGY_TICK_MS;
    const id = window.setInterval(() => dispatch({ type: 'RESTORE_ENERGY_TICK' }), interval);
    return () => window.clearInterval(id);
  }, [state.shelterGenerator, dispatch]);

  // Бой живёт в состоянии игры и обновляется даже когда экран скрыт.
  useEffect(() => {
    if (serverMode && (state.battle?.source !== 'boss' || state.battle.outcome !== 'fighting')) return;
    const timer = window.setInterval(() => dispatch({ type: 'BOSS_TICK', now: Date.now() }), 1000);
    return () => window.clearInterval(timer);
  }, [dispatch, state.battle?.source, state.battle?.outcome]);

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
      serverMode,
      staffRole,
    }),
    [state, vkUser, isLoading, dispatch, staffRole]
  );

  return <GameContext.Provider value={value}>
    {serverMode && !serverReady ? <div role="alert" style={{ padding: 24, color: 'white', background: '#211b16', minHeight: '100vh' }}>
      <p>{isLoading ? 'Загружаем серверное сохранение…' : serverError || 'Серверное сохранение недоступно.'}</p>
      {!isLoading && <button type="button" onClick={() => void loadServer()}>Повторить загрузку</button>}
    </div> : children}
    {serverMode && serverReady && <aside style={{ position: 'fixed', zIndex: serverError ? 100002 : 100000, bottom: 0, left: 0, right: 0, padding: 8, background: '#392c1b', color: 'white', fontSize: 13 }} role="status">
      Тестовый серверный режим: общие кланы и реальные платежи пока недоступны.
      {serverError && <> {serverError}</>} <button type="button" onClick={() => void loadServer()}>Обновить с сервера</button>
    </aside>}
  </GameContext.Provider>;
};

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame вне GameProvider');
  }
  return ctx;
};
