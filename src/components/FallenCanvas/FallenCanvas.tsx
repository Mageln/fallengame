import React, { useState, useEffect, useCallback } from "react";
import styles from "../../style/PrisonCanvas/PrisonCanvas.module.scss";
import { PrisonCanvasProps } from "./types";
import { useCanvas } from "./useCanvas";
import { useIcon } from "../../hooks/useIcon";
import { APPEARANCES } from "../../game/constants";
import { TASKS } from "./tasks";
import { CanvasOverlay } from "./CanvasOverlay";

export const FallenCanvas: React.FC<PrisonCanvasProps & {
  carLevel?: number;
  level?: number;
  currentDistrict?: string;
  districtName?: string;
  onEnterDistrict?: (id: string) => void;
  onUpgradeCar?: () => void;
  onBattle?: () => void;
  onToggleSound?: () => void;
  soundEnabled?: boolean;
  onGoProfile?: () => void;
  onGoWorkshop?: () => void;
  onGoRaid?: () => void;
  onGoClan?: () => void;
  onGoInventory?: () => void;
  onGoQuests?: () => void;
  onGoCrafting?: () => void;
  onLottery?: () => void;
  onClaimDaily?: () => void;
  onSearchFriend?: () => void;
  onRadioHelp?: () => void;
  completedQuests?: number;
  radioRequests?: number;
  daily?: { lotteryUsed: boolean; goldClaimed: boolean };
  lockedDistricts?: { id: string; name: string; carLevel: number }[];
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
  onLocationChange,
  carLevel = 1,
  level = 1,
  currentDistrict,
  districtName = '',
  onEnterDistrict,
  onUpgradeCar,
  onBattle,
  onToggleSound,
  soundEnabled = true,
  onGoProfile,
  onGoWorkshop,
  onGoRaid,
  onGoClan,
  onGoInventory,
  onGoQuests,
  onGoCrafting,
  onLottery,
  onClaimDaily,
  onSearchFriend,
  onRadioHelp,
  completedQuests = 0,
  radioRequests = 0,
  daily = { lotteryUsed: false, goldClaimed: false },
  lockedDistricts = [],
}) => {
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [characterImage, setCharacterImage] = useState<HTMLImageElement | null>(null);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);

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
    const img = new Image();
    img.onload = () => setMapImage(img);
    img.onerror = () => setMapImage(null);
    img.src = '/map/map.jpg';
  }, []);

  const handleTaskComplete = useCallback((id: string) => {
    if (onTaskComplete) onTaskComplete(id);
  }, [onTaskComplete]);

  const handleResourceClick = useCallback((id: string) => {
    if (onResourceClick) onResourceClick(id);
  }, [onResourceClick]);

  const handleZombieClick = useCallback(() => {
    if (onZombieClick) onZombieClick();
  }, [onZombieClick]);

  const handleMapClick = useCallback(() => {
    if (onMapToggle) onMapToggle();
  }, [onMapToggle]);

  const { canvasRef, handleCanvasClick, handleMouseMove } = useCanvas(
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
    zombieHealth,
    maxZombieHealth,
    isZombieAlive,
    handleResourceClick,
    handleTaskComplete,
    handleZombieClick,
    canvasTasks,
    appearanceColor,
    showMap,
    mapImage,
    handleMapClick
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
      <CanvasOverlay
        currentLocation={currentLocation || 'location1'}
        currentDistrict={currentDistrict || 'southgate'}
        carLevel={carLevel}
        level={level}
        energy={energy}
        maxEnergy={maxEnergy}
        onToggleMap={onMapToggle || (() => {})}
        onChangeLocation={onLocationChange || (() => {})}
        onEnterDistrict={onEnterDistrict || (() => {})}
        onUpgradeCar={onUpgradeCar || (() => {})}
        onToggleSound={onToggleSound || (() => {})}
        soundEnabled={soundEnabled}
        onGoProfile={onGoProfile || (() => {})}
        onGoWorkshop={onGoWorkshop || (() => {})}
        onGoRaid={onGoRaid || (() => {})}
        onGoClan={onGoClan || (() => {})}
        onGoInventory={onGoInventory || (() => {})}
        onGoQuests={onGoQuests || (() => {})}
        onGoCrafting={onGoCrafting || (() => {})}
        onLottery={onLottery || (() => {})}
        onClaimDaily={onClaimDaily || (() => {})}
        onSearchFriend={onSearchFriend || (() => {})}
        onRadioHelp={onRadioHelp || (() => {})}
        onClaimQuest={() => {}}
        onBattle={onBattle || (() => {})}
        districtName={districtName}
        lockedDistricts={lockedDistricts}
        completedQuests={completedQuests}
        radioRequests={radioRequests}
        daily={daily}
      />
    </div>
  );
};

export * from "./types";
export * from "./tasks";
