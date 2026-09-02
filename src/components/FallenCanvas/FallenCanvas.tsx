import React, { useState, useEffect, useCallback } from "react";
import styles from "../../style/PrisonCanvas/PrisonCanvas.module.scss";
import { PrisonCanvasProps } from "./types";
import { useCanvas } from "./useCanvas";
import { useIcon } from "../../hooks/useIcon";
import { APPEARANCES } from "../../game/constants";
import { TASKS } from "./tasks";
import { BossData } from "./drawUI";

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
  // Профиль
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
  onBattleClick?: () => void;
  onFriendsClick?: () => void;
  onArenaClick?: () => void;
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
  showMap = false,
  onMapToggle,
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
  // Профиль
  showProfile = false,
  profileData,
  onBattleClick,
  onFriendsClick,
  onArenaClick,
}) => {
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [characterImage, setCharacterImage] = useState<HTMLImageElement | null>(null);
  const [showBossModal, setShowBossModal] = useState(false);

  // Фейковые боссы
  const fakeBosses: BossData[] = [
    {
      id: '1',
      name: 'Михалыч',
      source: 'Район',
      health: 100,
      maxHealth: 100,
      reward: { skulls: 100, gold: 200, weapons: 0, weaponLevel: 1 },
      requiredWeapons: [{ level: 1, count: 1 }],
      avatar: null,
      lastWinner: 'Руслан Зарипов',
      wins: 0,
      maxWins: 100,
    },
    {
      id: '2',
      name: 'Департамент',
      source: 'Подвал',
      health: 200,
      maxHealth: 200,
      reward: { skulls: 200, gold: 500, weapons: 0, weaponLevel: 1 },
      requiredWeapons: [{ level: 1, count: 1 }],
      avatar: null,
      lastWinner: 'Руслан Зарипов',
      wins: 0,
      maxWins: 100,
    },
    {
      id: '3',
      name: 'Тюменец',
      source: 'Район',
      health: 300,
      maxHealth: 300,
      reward: { skulls: 300, gold: 800, weapons: 0, weaponLevel: 2 },
      requiredWeapons: [{ level: 2, count: 1 }],
      avatar: null,
      lastWinner: 'Руслан Зарипов',
      wins: 0,
      maxWins: 100,
    },
    {
      id: '4',
      name: 'Сотник',
      source: 'Подвал',
      health: 500,
      maxHealth: 500,
      reward: { skulls: 500, gold: 1200, weapons: 0, weaponLevel: 2 },
      requiredWeapons: [{ level: 2, count: 1 }],
      avatar: null,
      lastWinner: 'Руслан Зарипов',
      wins: 0,
      maxWins: 100,
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

  const handleZombieClick = useCallback(() => {
    if (onZombieClick) onZombieClick();
  }, [onZombieClick]);

  const handleBossClick = useCallback(() => {
    setShowBossModal(true);
  }, []);

  const handleBossModalClose = useCallback(() => {
    setShowBossModal(false);
  }, []);

  const handleBackToMain = useCallback(() => {
    setShowBossModal(false);
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
    currentDistrict,
    districtName,
    onGoProfile,
    handleBossClick,
    handleBossModalClose,
    handleBackToMain,
    onFriendsClick || onGoClan,
    onGoWorkshop,
    onGoRaid,
    onGoClan,
    onGoInventory,
    onGoQuests,
    onGoCrafting,
    onLottery,
    onClaimDaily,
    undefined, // onRestoreSpicki
    undefined, // onRestoreBullets
    undefined, // onRestoreGold
    undefined, // onRestoreZhetons
    undefined, // onGoCloth
    undefined, // onGoKomnata
    undefined, // onGoKazino
    undefined, // onGoDistrict
    showProfile,
    showMap,
    showBossModal,
    profileData ? {
      level: profileData.level,
      stamina: profileData.stamina,
      damage: profileData.damage,
      luck: profileData.luck,
      crit: profileData.crit,
      gold: profileData.gold,
      spicki: profileData.spicki,
      bullets: profileData.bullets,
      zhetons: profileData.zhetons,
      appearance: profileData.appearance,
      carLevel: profileData.carLevel,
      weapon: profileData.weapon,
    } : null,
    fakeBosses,
    false 
  );

  return (
    <div className={styles.canvasWrapper}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => undefined}
      />
      {/* Кнопка fullscreen */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleFullscreen();
        }}
        style={{
          position: 'absolute',
          border: "none",
          top: 1,
          right: 100,
          zIndex: 100,
          background: "transparent",
          padding: '8px 12px',
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        ⛶ 
      </button>
    </div>
  );
};

export * from "./types";
export * from "./tasks";
