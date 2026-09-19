import React, { useState, useEffect, useCallback, useRef } from "react";
import styles from "../../style/PrisonCanvas/PrisonCanvas.module.scss";
import { PrisonCanvasProps } from "./types";
import { useCanvas } from "./useCanvas";
import { useIcon } from "../../hooks/useIcon";
import { APPEARANCES } from "../../game/constants";
import { TASKS } from "./tasks";
import { MapRaid, BossData, BossFight } from "./drawUI";
import { FAKE_BOSSES } from "./bosses";
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
  const [topBarImage, setTopBarImage] = useState<HTMLImageElement | null>(null);

  // Боссы: текущее здоровье переживает закрытие окна боя
  const [bosses, setBosses] = useState<BossData[]>(() => FAKE_BOSSES.map((boss) => ({ ...boss })));
  const [bossFight, setBossFight] = useState<BossFight | null>(null);

  // "Атаковать"/"В бой" — открывает модальное окно боя с этим боссом
  const handleBossAttack = useCallback(
    (bossId: string) => {
      const boss = bosses.find((item) => item.id === bossId);
      if (!boss) return;
      const now = performance.now();
      const playerMaxHp = Math.max(50, Math.round(profileData?.stamina ?? 100));
      setBossFight({
        bossId: boss.id,
        bossName: boss.name,
        bossColor: boss.color,
        bossHp: boss.hp,
        bossMaxHp: boss.maxHealth,
        playerHp: playerMaxHp,
        playerMaxHp,
        startedAt: now,
        bossHitAt: now,
        playerHitAt: now,
        lastDamage: 0,
        outcome: 'fighting',
      });
    },
    [bosses, profileData?.stamina]
  );

  // Удар в окне боя: снимаем ХП боссу, босс отвечает сразу же
  const handleFightAttack = useCallback(() => {
    setBossFight((prev) => {
      if (!prev || prev.outcome !== 'fighting') return prev;
      const now = performance.now();
      const damage = Math.max(1, Math.round(profileData?.damage ?? 10));
      const bossHp = Math.max(0, prev.bossHp - damage);
      if (bossHp <= 0) {
        return { ...prev, bossHp, bossHitAt: now, lastDamage: damage, outcome: 'won' };
      }
      const answer = Math.max(1, Math.round(prev.bossMaxHp / 40));
      const playerHp = Math.max(0, prev.playerHp - answer);
      return {
        ...prev,
        bossHp,
        bossHitAt: now,
        lastDamage: damage,
        playerHp,
        playerHitAt: now,
        outcome: playerHp <= 0 ? 'lost' : 'fighting',
      };
    });
  }, [profileData?.damage]);

  // Выход из боя: победа — награда и полный отдых босса, поражение — босс остаётся раненым
  const handleFightLeave = useCallback(() => {
    if (!bossFight) return;
    const won = bossFight.outcome === 'won';
    const reward = bosses.find((boss) => boss.id === bossFight.bossId)?.attackReward;

    if (won && reward) {
      dispatch({ type: 'ADD_RESOURCE', resource: 'gold', amount: reward.gold });
      dispatch({ type: 'ADD_RESOURCE', resource: 'bullets', amount: reward.bullets });
    }

    setBosses((list) =>
      list.map((boss) =>
        boss.id === bossFight.bossId
          ? { ...boss, hp: won ? boss.maxHealth : bossFight.bossHp }
          : boss
      )
    );
    setBossFight(null);
  }, [bossFight, bosses, dispatch]);

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

  // Загружаем фон верхней панели
  useEffect(() => {
    const panelImg = new Image();
    panelImg.onload = () => setTopBarImage(panelImg);
    panelImg.onerror = () => setTopBarImage(null);
    panelImg.src = '/upperbackground.png';
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

  const { canvasRef, handleCanvasClick, handleMouseMove, handleMouseLeave, handleWheel, toggleFullscreen } = useCanvas(
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
    handleBossAttack,  // урон по боссу из окна боссов
    // State
    showProfile,
    showBossModal,
    showMap,
    profileData,
    bosses,
    mapRaids,
    mapImage,
    topBarImage,
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
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
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
