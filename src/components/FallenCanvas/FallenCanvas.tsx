import { characterSpritePath, heldWeaponPath } from '../../game/heldWeapon';
import { clothingVisualPath, equippedClothingVisuals } from '../../game/clothingVisuals';
import React, { useState, useEffect, useCallback } from "react";
import styles from "../../style/PrisonCanvas/PrisonCanvas.module.scss";
import { PrisonCanvasProps } from "./types";
import { useCanvas } from "./useCanvas";
import { useIcon } from "../../hooks/useIcon";
import { APPEARANCES, getNextLockedRoom, resolveBackground } from "../../game/constants";
import { TASKS } from "./tasks";
import { MapRaid } from "./drawUI";
import { FAKE_BOSSES } from "./bosses";
import { RaidModal } from "../../panels/RaidModal";
import { ClanModal } from "../../panels/Clan";
import { RoomModal } from "../../panels/Room";
import { getBossArt, isEnraged } from '../../game/enemyArt';
import { Arena } from "../../panels/Arena";
import { CasinoModal } from "../../panels/Casino";
import { StoreModal } from "../../panels/Store";
import { BossFightPanel, BossHub } from "../../panels/Boss";
import { ResourceTopUp } from "../../panels/ResourceTopUp";
import type { TopUpResource } from "../../game/resourceTopUp";
import { FriendsPanel } from "../../panels/Friends";
import { NotificationsPanel } from "../NotificationsPanel";
import { useGame } from "../../game/GameContext";
import { GameNotification } from "../../game/types";

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
    experience: number;
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
  onRoomsClick?: () => void;
  onArenaClick?: () => void;
  onRaidClick?: (raidId: string) => void;
  onGoDistrict?: () => void;
  showMap?: boolean;
  mapRaids?: MapRaid[];
  raidMapImage?: string;
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
  energy,
  maxEnergy,
  authority,
  spicki = 0,
  bullets = 0,
  gold = 0,
  zhetons = 0,
  appearance = 0,
  tasks,
  currentLocation,
  carLevel = 1,
  level = 1,
  districtName = '',
  onGoProfile,
  onGoClan,
  onGoInventory,
  onGoQuests,
  onGoCrafting,
  onOpenBossModal,
  // Профиль
  showProfile = false,
  showMap = false,
  profileData,
  onProfileClose,
  onRaidClick,
  onGoDistrict,
  onCloseMap,
  mapRaids = [],
  raidMapImage = '/map/map.jpg',
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
  onRoomsClick,
}) => {
  const { dispatch, state } = useGame();
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [heldWeapon, setHeldWeapon] = useState<{ id: string; image: HTMLImageElement } | null>(null);
  const [clothingImages, setClothingImages] = useState<HTMLImageElement[]>([]);
  const [capImage, setCapImage] = useState<HTMLImageElement | null>(null);
  const [characterImage, setCharacterImage] = useState<HTMLImageElement | null>(null);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [topBarImage, setTopBarImage] = useState<HTMLImageElement | null>(null);
  // Спрайт босса для окна боя
  const [bossImage, setBossImage] = useState<HTMLImageElement | null>(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [topUpResource, setTopUpResource] = useState<TopUpResource | null>(null);
  const [showArena, setShowArena] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [showCasino, setShowCasino] = useState(false);
  const [showFriends, setShowFriends] = useState(false);

  useEffect(() => {
    const image = new Image();
    image.onload = () => setCapImage(image);
    image.onerror = () => setCapImage(null);
    image.src = '/characters/survivor-cap-v2.png';
    return () => { image.onload = null; image.onerror = null; };
  }, []);

  useEffect(() => {
    const path = heldWeaponPath(state.weapon.id);
    if (!path) { setHeldWeapon(null); return; }
    const image = new Image();
    const id = state.weapon.id;
    image.onload = () => setHeldWeapon({ id, image });
    image.onerror = () => setHeldWeapon(null);
    image.src = path;
    return () => { image.onload = null; image.onerror = null; };
  }, [state.weapon.id]);

  const clothingKey = equippedClothingVisuals(state.equipmentIds).join(',');
  useEffect(() => {
    let cancelled = false;
    const ids = clothingKey ? clothingKey.split(',') : [];
    setClothingImages([]);
    Promise.all(ids.map(id => new Promise<HTMLImageElement | null>(resolve => {
      const image = new Image();
      image.dataset.clothingId = id;
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = clothingVisualPath(id);
    }))).then(images => { if (!cancelled) setClothingImages(images.filter((image): image is HTMLImageElement => image !== null)); });
    return () => { cancelled = true; };
  }, [clothingKey]);

  // "Атаковать"/"В бой" — запускает бой через reducer (state.battle)
  const handleBossAttack = useCallback(
    (bossId: string) => {
      dispatch({ type: 'START_BOSS_FIGHT', bossId });
    },
    [dispatch]
  );

  // Кнопки окна боя — dispatch в reducer.
  // Удар и Приём — это BATTLE_ATTACK с technique=false/true.
  const handleFightAttack = useCallback(() => {
    dispatch({ type: 'BATTLE_ATTACK', technique: false });
  }, [dispatch]);

  const handleFightTechnique = useCallback(() => {
    dispatch({ type: 'BATTLE_ATTACK', technique: true });
  }, [dispatch]);

  const handleFightPower = useCallback(() => {
    dispatch({ type: 'BATTLE_POWER' });
  }, [dispatch]);

  const handleFightCombo = useCallback(() => {
    dispatch({ type: 'BATTLE_COMBO' });
  }, [dispatch]);

  const handleFightBlock = useCallback(() => {
    dispatch({ type: 'BATTLE_BLOCK' });
  }, [dispatch]);

  const handleFightEvade = useCallback(() => {
    dispatch({ type: 'BATTLE_EVADE' });
  }, [dispatch]);

  const handleFightHeal = useCallback(() => {
    dispatch({ type: 'BATTLE_HEAL' });
  }, [dispatch]);

  const handleFightGrenade = useCallback(() => {
    dispatch({ type: 'BATTLE_GRENADES', count: 1 });
  }, [dispatch]);

  const handleFightLeave = useCallback(() => {
    dispatch({ type: 'LEAVE_BATTLE' });
  }, [dispatch]);

  const { icons } = useIcon();
  const appearanceColor = APPEARANCES.find((item) => item.id === appearance)?.color ?? '#d4a574';
  const canvasTasks = tasks ?? TASKS;

  // Загружаем фон (комната/скин) и персонажа.
  useEffect(() => {
    const bgFile = resolveBackground(state.currentLocation, state.selectedSkins, state.unlockedRooms);
    const bgImg = new Image();
    bgImg.onload = () => setBackgroundImage(bgImg);
    bgImg.onerror = () => setBackgroundImage(null);
    bgImg.src = `/${bgFile}`;
    return () => { bgImg.onload = null; bgImg.onerror = null; };
  }, [state.currentLocation, state.selectedSkins, state.unlockedRooms]);

  useEffect(() => {
    const charImg = new Image();
    charImg.onload = () => setCharacterImage(charImg);
    charImg.onerror = () => setCharacterImage(null);
    charImg.src = characterSpritePath(state.weapon.id);
    return () => { charImg.onload = null; charImg.onerror = null; };
  }, [state.weapon.id]);

  // Загружаем карту
  useEffect(() => {
    setMapImage(null);
    const mapImg = new Image();
    mapImg.crossOrigin = 'anonymous';
    mapImg.onload = () => setMapImage(mapImg);
    mapImg.onerror = () => setMapImage(null);
    mapImg.src = raidMapImage;
    return () => { mapImg.onload = null; mapImg.onerror = null; };
  }, [raidMapImage]);

  // Загружаем фон верхней панели
  useEffect(() => {
    const panelImg = new Image();
    panelImg.onload = () => setTopBarImage(panelImg);
    panelImg.onerror = () => setTopBarImage(null);
    panelImg.src = '/upperbackground.png';
  }, []);

  // Для боя района выбираем фазу по HP. Сброс и очистка обработчиков не
  // позволяют опоздавшей загрузке первой фазы заменить уже новую картинку.
  const canvasBattle = state.battle?.source !== 'boss' ? state.battle : null;
  const canvasBossArt = canvasBattle ? getBossArt(canvasBattle.bossId) : null;
  const canvasBossSrc = canvasBattle && canvasBossArt
    ? (isEnraged(canvasBattle.bossHp, canvasBattle.bossMaxHp) ? canvasBossArt.enraged : canvasBossArt.normal) : null;
  useEffect(() => {
    setBossImage(null);
    if (!canvasBossSrc) return;
    const image = new Image();
    image.onload = () => setBossImage(image);
    image.onerror = () => setBossImage(null);
    image.src = canvasBossSrc;
    return () => { image.onload = null; image.onerror = null; };
  }, [canvasBossSrc]);

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

  // Все кнопки "Назад" закрывают все оверлеи и возвращают на главную
  const handleBackToMain = useCallback(() => {
    onProfileClose?.();
    setShowRoomModal(false);
    if (state.showBossModal) dispatch({ type: 'TOGGLE_BOSS_MODAL' });
    if (state.showMap) dispatch({ type: 'TOGGLE_MAP' });
  }, [onProfileClose, state.showBossModal, state.showMap, dispatch]);

  // Плюс открывает выбор пакета, а не изменяет баланс сразу.
  const closeTopUp = useCallback(() => setTopUpResource(null), []);

  const lockedRoomsRemain = getNextLockedRoom(state.unlockedRooms) !== null;

  const { canvasRef, handleCanvasClick, handleMouseMove, handleMouseLeave, handleWheel } = useCanvas(
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
    () => setShowArena(true), // Кнопка «Арена»
    onProfileClose,    // onBossModalClose
    onCloseMap,        // onCloseMap
    onOpenBossModal,   // onOpenBossModal
    onProfileClose,    // onCloseProfile
    handleBackToMain,  // onBackToMain — все кнопки "Назад" ведут на главную
    onGoDistrict,      // onGoDistrict — кнопка "Районы" открывает карту
    () => setTopUpResource('energy'),
    () => setTopUpResource('matches'),
    () => setTopUpResource('bullets'),
    () => setTopUpResource('gold'),
    () => setTopUpResource('zhetons'),
    onRaidClick,       // клик по рейду на карте районов
    handleBossAttack, // "Атаковать"/"В бой" в окне боссов
    handleFightAttack, // "Удар" в окне боя
    handleFightLeave,  // "Отступить"/"Закрыть" в окне боя
    handleFightTechnique,
    handleFightPower,
    handleFightCombo,
    handleFightBlock,
    handleFightEvade,
    handleFightHeal,
    handleFightGrenade,
    // Нижняя панель (клан, инвентарь, квесты, крафт)
    undefined, // onClanClick (не используется, вместо него onGoClan)
    undefined, // onInventoryClick
    undefined, // onQuestsClick
    undefined, // onCraftingClick
    onGoClan,
    onGoInventory,
    onGoQuests,
    onGoCrafting,
    () => setShowFriends(true),
    onRoomsClick,
    // State
    showProfile,
    false, // Боссы теперь в доступном React-окне
    showMap,
    profileData,
    FAKE_BOSSES,
    state.battle?.source === 'boss' ? null : state.battle,
    state.medkits,
    state.grenades,
    mapRaids,
    mapImage,
    topBarImage,
    bossImage,
    lastMessage, // сообщение о последнем действии (показывается на карте районов)
    unreadNotifications, // бейдж непрочитанных уведомлений в верхней панели
    onNotificationsClick, // клик по колокольчику
    showRoomModal,
    state.unlockedRooms,
    () => setShowRoomModal(true),
    undefined, // onSelectRoom — выбор комнаты теперь в React-модалке
    lockedRoomsRemain,
    state.premiumGold,
    () => setTopUpResource('premium'),
    () => setShowStore(true),
    state.equipmentIds.includes('shop_cap') ? capImage : null,
    () => setShowCasino(true),
    clothingImages,
    heldWeapon?.id === state.weapon.id ? heldWeapon.image : null
  );

  return (
    <div className={styles.canvasWrapper}>
      <canvas
        ref={canvasRef}
        data-tutorial-canvas="true"
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

      {/* Модальное окно клана */}
      {state.showClanModal && (
        <ClanModal onClose={() => dispatch({ type: 'TOGGLE_CLAN_MODAL' })} />
      )}

      {state.showBossModal && !state.battleVisible && (
        <BossHub onClose={() => dispatch({ type: 'TOGGLE_BOSS_MODAL' })} />
      )}
      <BossFightPanel />
      {showArena && <Arena onClose={() => setShowArena(false)} />}
      {showCasino && <CasinoModal onClose={() => setShowCasino(false)} />}
      {showStore && <StoreModal onClose={() => setShowStore(false)} />}
      {topUpResource && <ResourceTopUp resource={topUpResource} onClose={closeTopUp} />}
      {showFriends && <FriendsPanel onClose={() => setShowFriends(false)} />}

      {/* Модальное окно комнаты-убежища (в стиле клана) */}
      {showRoomModal && (
        <RoomModal onClose={() => setShowRoomModal(false)} />
      )}
    </div>
  );
};

export * from "./types";
export * from "./tasks";
