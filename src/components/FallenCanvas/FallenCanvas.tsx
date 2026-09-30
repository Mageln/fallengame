import React, { useState, useEffect, useCallback, useRef } from "react";
import styles from "../../style/PrisonCanvas/PrisonCanvas.module.scss";
import { PrisonCanvasProps } from "./types";
import { useCanvas } from "./useCanvas";
import { useIcon } from "../../hooks/useIcon";
import { APPEARANCES } from "../../game/constants";
import { TASKS } from "./tasks";
import { MapRaid, BossFight } from "./drawUI";
import { FAKE_BOSSES } from "./bosses";
import { RaidModal } from "../../panels/RaidModal";
import { NotificationsPanel } from "../NotificationsPanel";
import { useGame } from "../../game/GameContext";
import { MapRaid as MapRaidType, GameNotification } from "../../game/types";

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
  lastMessage?: string;
  // Уведомления в верхней панели
  notifications?: GameNotification[];
  showNotifications?: boolean;
  unreadNotifications?: number;
  onNotificationsClick?: () => void;
  onNotificationRaidClick?: (raidId: string) => void;
  onNotificationRemove?: (id: string) => void;
  onNotificationsClear?: () => void;
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
  lastMessage = '',
  notifications = [],
  showNotifications = false,
  unreadNotifications = 0,
  onNotificationsClick,
  onNotificationRaidClick,
  onNotificationRemove,
  onNotificationsClear,
}) => {
  const { dispatch, state } = useGame();
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [characterImage, setCharacterImage] = useState<HTMLImageElement | null>(null);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [topBarImage, setTopBarImage] = useState<HTMLImageElement | null>(null);
  // Спрайт босса для окна боя
  const [bossImage, setBossImage] = useState<HTMLImageElement | null>(null);

  // Боссы: текущее здоровье переживает закрытие окна боя (в BossData его больше нет)
  const [bossHpById, setBossHpById] = useState<Record<string, number>>({});
  const [bossFight, setBossFight] = useState<BossFight | null>(null);

  // "Атаковать"/"В бой" — открывает модальное окно боя с этим боссом
  const handleBossAttack = useCallback(
    (bossId: string) => {
      const boss = FAKE_BOSSES.find((item) => item.id === bossId);
      if (!boss) return;
      const now = performance.now();
      const bossMaxHp = boss.level * 10;
      const savedHp = bossHpById[bossId] ?? bossMaxHp;
      const playerMaxHp = Math.max(50, Math.round(profileData?.stamina ?? 100));
      setBossFight({
        bossId: boss.id,
        bossName: boss.name,
        bossColor: boss.color,
        bossHp: savedHp > 0 ? savedHp : bossMaxHp,
        bossMaxHp,
        playerHp: playerMaxHp,
        playerMaxHp,
        startedAt: now,
        bossHitAt: now,
        playerHitAt: now,
        lastDamage: 0,
        outcome: 'fighting',
      });
    },
    [bossHpById, profileData?.stamina]
  );

  // Удар в окне боя: снимаем ХП боссу, босс отвечает сразу же
  const handleFightAttack = useCallback(() => {
    setBossFight((prev) => {
      if (!prev || prev.outcome !== 'fighting') return prev;
      const now = performance.now();
      const damage = Math.max(1, Math.round(profileData?.damage ?? 10));
      const bossHp = Math.max(0, prev.bossHp - damage);
      if (bossHp <= 0) {
        return { ...prev, bossHp, bossHitAt: now, lastDamage: damage, outcome: 'won', endedAt: now };
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

  // Награда за победу выдаётся сразу же — окно боя показывает уже начисленное
  const rewardAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!bossFight || bossFight.outcome !== 'won') return;
    const key = `${bossFight.bossId}:${bossFight.startedAt}`;
    if (rewardAppliedRef.current === key) return;
    const reward = FAKE_BOSSES.find((boss) => boss.id === bossFight.bossId)?.attackReward;
    if (!reward) return;
    rewardAppliedRef.current = key;
    dispatch({ type: 'ADD_RESOURCE', resource: 'gold', amount: reward.gold });
    dispatch({ type: 'ADD_RESOURCE', resource: 'bullets', amount: reward.bullets });
    setBossFight((prev) =>
      prev && prev.outcome === 'won' ? { ...prev, reward: { gold: reward.gold, bullets: reward.bullets } } : prev
    );
  }, [bossFight, dispatch]);

  // Выход из боя: победа — сброс здоровья босса, отступление/поражение — босс остаётся раненым
  const handleFightLeave = useCallback(() => {
    if (!bossFight) return;
    const won = bossFight.outcome === 'won';

    setBossHpById((prev) => {
      const next = { ...prev };
      if (won) delete next[bossFight.bossId];
      else next[bossFight.bossId] = bossFight.bossHp;
      return next;
    });
    setBossFight(null);
  }, [bossFight, dispatch]);


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

  // Загружаем спрайт босса для окна боя
  useEffect(() => {
    const bossImg = new Image();
    bossImg.onload = () => setBossImage(bossImg);
    bossImg.onerror = () => setBossImage(null);
    bossImg.src = '/enemy/zombi1.jpg';
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
    handleBossAttack,  // "Атаковать"/"В бой" в окне боссов
    handleFightAttack, // "Удар" в окне боя
    handleFightLeave,  // "Отступить"/"Закрыть" в окне боя
    // State
    showProfile,
    showBossModal,
    showMap,
    profileData,
    FAKE_BOSSES,
    bossFight,
    mapRaids,
    mapImage,
    topBarImage,
    bossImage,
    false, // fullscreen
    lastMessage, // сообщение о последнем действии (показывается на карте районов)
    unreadNotifications, // бейдж непрочитанных уведомлений в верхней панели
    onNotificationsClick // клик по колокольчику
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
      
      {/* Панель уведомлений (открывается кликом по колокольчику в верхней панели) */}
      {showNotifications && (
        <NotificationsPanel
          notifications={notifications}
          onClose={() => onNotificationsClick?.()}
          onRaidClick={onNotificationRaidClick}
          onRemove={onNotificationRemove}
          onClearAll={onNotificationsClear}
        />
      )}

      {/* Модальное окно рейда */}
      {state.showRaidModal && state.activeRaidId && onRaidClick && (
        <RaidModal
          raidId={state.activeRaidId}
          onClaim={() => {
            dispatch({ type: 'CLAIM_RAID_REWARD', raidId: state.activeRaidId! });
          }}
          onCancel={() => {
            dispatch({ type: 'CANCEL_RAID', raidId: state.activeRaidId! });
          }}
          onMinimize={() => {
            dispatch({ type: 'MINIMIZE_RAID' });
          }}
        />
      )}
    </div>
  );
};

export * from "./types";
export * from "./tasks";
