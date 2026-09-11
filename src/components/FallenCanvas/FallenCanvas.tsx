import React, { useState, useEffect, useCallback, useRef } from "react";
import styles from "../../style/PrisonCanvas/PrisonCanvas.module.scss";
import { PrisonCanvasProps } from "./types";
import { useCanvas } from "./useCanvas";
import { useIcon } from "../../hooks/useIcon";
import { APPEARANCES } from "../../game/constants";
import { TASKS } from "./tasks";
import { BossData, MapRaid } from "./drawUI";
import { RaidModal } from "../../panels/RaidModal";
import { useGame } from "../../game/GameContext";
import { MapRaid as MapRaidType } from "../../game/types";

export const FallenCanvas: React.FC<PrisonCanvasProps & {
  carLevel?: number;
  level?: number;
  currentDistrict?: string;
  districtName?: string;
  onBattle?: () => void;
  onGoProfile?: () => void;
  onGoWorkshop?: () => void;
  onGoRaid?: () => void;
  onGoClan?: () => void;
  onGoInventory?: () => void;
  onGoQuests?: () => void;
  onGoCrafting?: () => void;
  onLottery?: () => void;
  onClaimDaily?: () => void;
  onOpenBossModal?: () => void;
  // Профиль
  showBossModal?: boolean;
  showProfile?: boolean;
  profileData?: {
    level: number;
    stamina: number;
    damage: number;
    luck: number;
    crit: number;
    gold: number;
    spicki: number;
    bullets: number;
    zhetons: number;
    appearance: number;
    carLevel: number;
    weapon: { name: string; level: number; broken: boolean };
  };
  onProfileClose?: () => void;
  onCloseProfile?: () => void;
  onBattleClick?: () => void;
  onFriendsClick?: () => void;
  onArenaClick?: () => void;
  onRaidClick?: (raidId: string) => void;
  onGoDistrict?: () => void;
  showMap?: boolean;
  mapRaids?: MapRaid[];
  playerName?: string;
  avatarUrl?: string;
}> = ({
  onTaskComplete,
  onResourceClick,
  onZombieClick,
  energy,
  maxEnergy,
  authority,
  spicki = 0,
  bullets = 0,
  gold = 0,
  zhetons = 0,
  zombieHealth = 100,
  maxZombieHealth = 100,
  isZombieAlive = true,
  appearance = 0,
  tasks,
  currentLocation,
  carLevel = 1,
  level = 1,
  currentDistrict,
  districtName = '',
  onBattle,
  onGoProfile,
  onGoWorkshop,
  onGoRaid,
  onGoClan,
  onGoInventory,
  onGoQuests,
  onGoCrafting,
  onLottery,
  onClaimDaily,
  onOpenBossModal,
  // Профиль
  showBossModal = false,
  showProfile = false,
  showMap = false,
  profileData,
  onProfileClose,
  onCloseProfile,
  onBattleClick,
  onFriendsClick,
  onArenaClick,
  onRaidClick,
  onGoDistrict,
  onCloseMap,
  mapRaids = [],
  playerName = 'Игрок',
  avatarUrl,
}) => {
  const { dispatch, state } = useGame();
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [characterImage, setCharacterImage] = useState<HTMLImageElement | null>(null);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);

  // Фейковые боссы
  const fakeBosses: BossData[] = [
    {
      id: '1',
      name: 'Михалыч',
      source: 'Район',
      health: 100,
      maxHealth: 100,
      rating: 0,
      avatar: null,
      reward: {
        skulls: 100,
        gold: 200,
        chest: 0,
        clothing: 0,
        key: 1,
      },
      dropChances: [
        { item: 'Старый нож', icon: '🔪', chance: 45 },
        { item: 'Бита', icon: '🏏', chance: 30 },
        { item: 'Пистолет', icon: '🔫', chance: 15 },
      ],
      requiredItems: [
        { name: 'Ключ', icon: '🔑', count: 1, have: 1 },
      ],
      lastWinner: {
        name: 'Руслан Зарипов',
        avatar: null,
      },
      wins: 0,
      maxWins: 100,
      winWeapons: [
        { level: 1, obtained: true },
        { level: 2, obtained: false },
        { level: 3, obtained: false },
        { level: 4, obtained: false },
        { level: 5, obtained: false },
      ],
    },
    {
      id: '2',
      name: 'Департамент',
      source: 'Подвал',
      health: 200,
      maxHealth: 200,
      rating: 0,
      avatar: null,
      reward: {
        skulls: 200,
        gold: 500,
        chest: 0,
        clothing: 0,
        key: 1,
      },
      dropChances: [
        { item: 'Автомат', icon: '🎯', chance: 20 },
        { item: 'Бронежилет', icon: '🦺', chance: 25 },
        { item: 'Аптечка', icon: '💊', chance: 35 },
      ],
      requiredItems: [
        { name: 'Ключ', icon: '🔑', count: 2, have: 1 },
      ],
      lastWinner: {
        name: 'Руслан Зарипов',
        avatar: null,
      },
      wins: 0,
      maxWins: 100,
      winWeapons: [
        { level: 1, obtained: false },
        { level: 2, obtained: false },
        { level: 3, obtained: false },
        { level: 4, obtained: false },
        { level: 5, obtained: false },
      ],
    },
    {
      id: '3',
      name: 'Тюменец',
      source: 'Район',
      health: 300,
      maxHealth: 300,
      rating: 0,
      avatar: null,
      reward: {
        skulls: 300,
        gold: 800,
        chest: 0,
        clothing: 0,
        key: 2,
      },
      dropChances: [
        { item: 'Винтовка', icon: '🔭', chance: 15 },
        { item: 'Шлем', icon: '⛑️', chance: 20 },
        { item: 'Бомба', icon: '💣', chance: 10 },
      ],
      requiredItems: [
        { name: 'Ключ', icon: '🔑', count: 2, have: 1 },
      ],
      lastWinner: {
        name: 'Руслан Зарипов',
        avatar: null,
      },
      wins: 0,
      maxWins: 100,
      winWeapons: [
        { level: 1, obtained: false },
        { level: 2, obtained: true },
        { level: 3, obtained: false },
        { level: 4, obtained: false },
        { level: 5, obtained: false },
      ],
    },
    {
      id: '4',
      name: 'Сотник',
      source: 'Подвал',
      health: 500,
      maxHealth: 500,
      rating: 0,
      avatar: null,
      reward: {
        skulls: 500,
        gold: 1200,
        chest: 0,
        clothing: 0,
        key: 3,
      },
      dropChances: [
        { item: 'Пулемёт', icon: '🔫', chance: 10 },
        { item: 'Тяжёлый жилет', icon: '🦺', chance: 15 },
        { item: 'Ракета', icon: '🚀', chance: 5 },
      ],
      requiredItems: [
        { name: 'Ключ', icon: '🔑', count: 3, have: 1 },
      ],
      lastWinner: {
        name: 'Руслан Зарипов',
        avatar: null,
      },
      wins: 0,
      maxWins: 100,
      winWeapons: [
        { level: 1, obtained: false },
        { level: 2, obtained: false },
        { level: 3, obtained: false },
        { level: 4, obtained: false },
        { level: 5, obtained: false },
      ],
    },
  ];

  const { icons } = useIcon();
  const appearanceColor = APPEARANCES.find((item) => item.id === appearance)?.color ?? '#d4a574';
  const canvasTasks = tasks ?? TASKS;

  // Загружаем фон и персонажа
  useEffect(() => {
    const bgImg = new Image();
    const charImg = new Image();
    
    bgImg.onload = () => setBackgroundImage(bgImg);
    bgImg.onerror = () => setBackgroundImage(null);
    bgImg.src = `/room${(currentLocation || 'location1').replace('location', '')}.jpg`;

    charImg.onload = () => setCharacterImage(charImg);
    charImg.onerror = () => setCharacterImage(null);
    charImg.src = '/pers1.png';
  }, [currentLocation]);

  // Загружаем карту
  useEffect(() => {
    const mapImg = new Image();
    mapImg.crossOrigin = 'anonymous';
    mapImg.onload = () => setMapImage(mapImg);
    mapImg.onerror = () => setMapImage(null);
    mapImg.src = '/map/map.jpg';
  }, []);

  // Загружаем аватар пользователя
  const [avatarImage, setAvatarImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!avatarUrl) {
      setAvatarImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => setAvatarImage(img);
    img.onerror = () => setAvatarImage(null);
    img.src = avatarUrl;
  }, [avatarUrl]);

  const handleZombieClick = useCallback(() => {
    if (onZombieClick) onZombieClick();
  }, [onZombieClick]);

  // Все кнопки "Назад" закрывают все оверлеи и возвращают на главную
  const handleBackToMain = useCallback(() => {
    onProfileClose?.();
    if (state.showBossModal) dispatch({ type: 'TOGGLE_BOSS_MODAL' });
    if (state.showMap) dispatch({ type: 'TOGGLE_MAP' });
  }, [onProfileClose, state.showBossModal, state.showMap, dispatch]);

  // Кнопки "+" — пополнение ресурсов (тестовый вариант: +10 за клик)
  const handleRestoreEnergy = useCallback(() => dispatch({ type: 'ADD_RESOURCE', resource: 'energy', amount: 10 }), [dispatch]);
  const handleRestoreSpicki = useCallback(() => dispatch({ type: 'ADD_RESOURCE', resource: 'matches', amount: 10 }), [dispatch]);
  const handleRestoreBullets = useCallback(() => dispatch({ type: 'ADD_RESOURCE', resource: 'bullets', amount: 10 }), [dispatch]);
  const handleRestoreGold = useCallback(() => dispatch({ type: 'ADD_RESOURCE', resource: 'gold', amount: 10 }), [dispatch]);
  const handleRestoreZhetons = useCallback(() => dispatch({ type: 'ADD_RESOURCE', resource: 'zhetons', amount: 10 }), [dispatch]);

  // Кнопка fullscreen (теперь рисуется на канвасе, правее ресурсов)
  const toggleFullscreenRef = useRef<(() => void) | null>(null);
  const handleToggleFullscreen = useCallback(() => {
    toggleFullscreenRef.current?.();
  }, []);

  const { canvasRef, handleCanvasClick, handleMouseMove, toggleFullscreen } = useCanvas(
    backgroundImage,
    characterImage,
    icons,
    energy,
    maxEnergy,
    authority,
    spicki,
    bullets,
    gold,
    zhetons,
    canvasTasks,
    appearanceColor,
    currentLocation,
    carLevel,
    level,
    districtName,
    playerName,
    avatarImage,
    // Callbacks
    onGoProfile,       // onProfileClick
    onBattleClick,     // onBattleClick
    onProfileClose,    // onBossModalClose
    onCloseMap,        // onCloseMap
    onOpenBossModal,   // onOpenBossModal
    onProfileClose,    // onCloseProfile
    handleBackToMain,  // onBackToMain — все кнопки "Назад" ведут на главную
    onGoDistrict,      // onGoDistrict — кнопка "Районы" открывает карту
    handleRestoreEnergy,
    handleRestoreSpicki,
    handleRestoreBullets,
    handleRestoreGold,
    handleRestoreZhetons,
    handleToggleFullscreen,
    onRaidClick,       // клик по рейду на карте районов
    // State
    showProfile,
    showBossModal,
    showMap,
    profileData,
    fakeBosses,
    mapRaids,
    mapImage,
    false // fullscreen
  );

  // Связываем ref с реальной функцией fullscreen из useCanvas
  toggleFullscreenRef.current = toggleFullscreen;

  return (
    <div className={styles.canvasWrapper}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => undefined}
      />
      
      {/* Модальное окно рейда */}
      {state.showRaidModal && state.activeRaid && onRaidClick && (
        <RaidModal
          raidId={state.activeRaid.id}
          onClaim={() => {
            dispatch({ type: 'CLAIM_RAID_REWARD', raidId: state.activeRaid!.id });
          }}
          onCancel={() => {
            dispatch({ type: 'CANCEL_RAID', raidId: state.activeRaid!.id });
          }}
        />
      )}
    </div>
  );
};

export * from "./types";
export * from "./tasks";
