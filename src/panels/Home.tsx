import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FallenCanvas } from '../components/FallenCanvas/FallenCanvas';
import { useGame } from '../game/GameContext';
import { DISTRICT_TASKS } from '../game/constants';
import { getDistrict } from '../game/formulas';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { DEFAULT_VIEW_PANELS } from '../routes';
import { RoomGallery } from './RoomGallery';
import { FriendsPanel } from './Friends';
import { SurvivorProfile } from './SurvivorProfile';
import { QuestBoard } from './QuestBoard';
import { LoginReward } from './LoginReward';
import { Tutorial } from './Tutorial';
import { TutorialBattlePreview } from './TutorialBattlePreview';
import { TUTORIAL_STEPS, tutorialIsActive, tutorialViewStep } from '../game/tutorial';
import { BossHub } from './Boss';
import { Arena } from './Arena';
import { StoreModal } from './Store';
import { RoomModal } from './Room';
import { ClanModal } from './Clan';
import { loginRewardStatus } from '../game/loginRewards';
import loginStyles from '../style/LoginReward.module.scss';
import extraStyles from '../style/ExtraRaids.module.scss';
import { EXTRA_MAP_RAIDS, RAID_REGIONS } from '../game/extraMapRaids';

interface HomeProps {
  id: string;
  userName?: string;
}

export const Home = ({ id }: HomeProps) => {
  const navigator = useRouteNavigator();
  const { state, dispatch, derived, vkUser, isLoading } = useGame();
  const district = getDistrict(state.currentDistrict);
  const [showProfile, setShowProfile] = useState(false);
  const [showRoomGallery, setShowRoomGallery] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [showLoginReward, setShowLoginReward] = useState(false);
  const [loginChecked, setLoginChecked] = useState(false);
  const tutorialActive = !isLoading && tutorialIsActive(state.tutorialVersion, state.tutorialStep);
  const gameLayer = useRef<HTMLDivElement>(null);
  const [tutorialPreview, setTutorialPreview] = useState('');
  const [tutorialMap, setTutorialMap] = useState(false);
  const [mapPage, setMapPage] = useState(0);
  const [unlockAttempt, setUnlockAttempt] = useState(false);
  const region = mapPage > 0 ? RAID_REGIONS[mapPage - 1] : undefined;
  const locked = !!region && !state.unlockedRaidRegions?.includes(region.id);
  useEffect(() => { if (!state.showMap) { setMapPage(0); setUnlockAttempt(false); } }, [state.showMap]);
  const tutorialId = tutorialActive ? TUTORIAL_STEPS[tutorialViewStep(state.tutorialVersion, state.tutorialStep)]?.id : undefined;
  useEffect(() => {
    setTutorialPreview(tutorialId === 'daily' ? 'daily' : ['fist', 'weapon', 'fist-block', 'block', 'fist-heal-1', 'fist-heal-2', 'heal', 'rage'].includes(tutorialId ?? '') ? 'battle' : '');
    setTutorialMap(false);
    setShowProfile(tutorialId === 'skills' || tutorialId === 'car');
    setShowQuests(false);
  }, [tutorialId]);
  const showTutorialPreview = (id: string) => {
    if (id === 'profile' || id === 'equipment' || id === 'workshop') setShowProfile(true);
    if (id === 'skills') document.querySelector<HTMLButtonElement>('[data-tutorial-target="profile-skills"]')?.click();
    if (id === 'map' || id === 'raid-start' || id === 'raid-claim') setTutorialMap(true);
    if (id === 'quests' || id === 'task') setShowQuests(true);
    if (id === 'boss') setTutorialPreview('boss');
    if (['arena', 'store', 'shelter', 'social', 'clan'].includes(id)) setTutorialPreview(id);
  };
  useLayoutEffect(() => {
    if (gameLayer.current) gameLayer.current.inert = tutorialActive;
  }, [tutorialActive]);

  // Открываем окно только после загрузки сохранения пользователя.
  useEffect(() => {
    if (isLoading || loginChecked || tutorialActive) return;
    setLoginChecked(true);
    if (loginRewardStatus(state.loginRewards).available) setShowLoginReward(true);
  }, [isLoading, loginChecked, state.loginRewards, tutorialActive]);

  // Просто закрыть профиль
  const closeProfileOnly = () => {
    setShowProfile(false);
  };

  // Просто закрыть карту
  const closeMapOnly = () => {
    dispatch({ type: 'TOGGLE_MAP' });
  };

  const openBattle = (districtId: string) => {
    dispatch({ type: 'START_BOSS', districtId });
  };

  // Пока есть идущие рейды — раз в секунду проверяем, не завершились ли они,
  // чтобы положить уведомление в верхнюю панель
  const hasRunningRaids = state.mapRaids.some((r) => r.isRunning && !r.notified);
  useEffect(() => {
    if (!hasRunningRaids) return;
    const interval = setInterval(() => dispatch({ type: 'CHECK_RAIDS' }), 1000);
    return () => clearInterval(interval);
  }, [hasRunningRaids, dispatch]);

  const unreadNotifications = state.notifications.filter((n) => !n.read).length;

  // Обработчики для рейдов
  const handleRaidClick = (raidId: string) => {
    dispatch({ type: 'OPEN_MAP_RAID', raidId });
  };

  return (
    <div id={id} style={{ width: '100vw', height: '100dvh', overflow: 'hidden', position: 'relative' }}>
      <div ref={gameLayer} aria-hidden={tutorialActive || undefined} style={{ width: '100%', height: '100%' }}>
      <FallenCanvas
        onTaskComplete={(taskId) => dispatch({ type: 'DO_TASK', taskId })}
        onResourceClick={() => {}}
        onZombieClick={() => district && openBattle(district.id)}
        energy={state.energy}
        maxEnergy={state.maxEnergy}
        authority={derived.stamina}
        spicki={state.matches}
        bullets={state.bullets}
        gold={state.gold}
        zhetons={state.zhetons}
        zombieHealth={district?.bossHp ?? 80}
        maxZombieHealth={district?.bossHp ?? 80}
        isZombieAlive
        appearance={state.appearance}
        tasks={DISTRICT_TASKS[state.currentDistrict] ?? DISTRICT_TASKS.southgate}
        showBossModal={state.showBossModal}
        currentLocation={state.currentLocation}
        carLevel={state.carLevel}
        level={state.level}
        currentDistrict={state.currentDistrict}
        districtName={district?.name || ''}
        onBattle={() => district && openBattle(district.id)}
        onGoProfile={() => setShowProfile(true)}
        onGoWorkshop={() => navigator.push(DEFAULT_VIEW_PANELS.WORKSHOP)}
        onGoRaid={() => navigator.push(DEFAULT_VIEW_PANELS.RAID)}
        onGoClan={() => dispatch({ type: 'TOGGLE_CLAN_MODAL' })}
        onGoInventory={() => navigator.push(DEFAULT_VIEW_PANELS.INVENTORY)}
        onGoQuests={() => setShowQuests(true)}
        onGoCrafting={() => navigator.push(DEFAULT_VIEW_PANELS.CRAFTING)}
        onLottery={() => dispatch({ type: 'LOTTERY' })}
        onClaimDaily={() => dispatch({ type: 'CLAIM_DAILY' })}
        onOpenBossModal={() => dispatch({ type: state.battle?.source === 'boss' ? 'OPEN_BATTLE' : 'TOGGLE_BOSS_MODAL' })}
        onCloseMap={closeMapOnly}
        onProfileClose={closeProfileOnly}
        onCloseProfile={closeProfileOnly}
        onBattleClick={() => {
          district && openBattle(district.id);
        }}
        onFriendsClick={() => {
          setShowFriends(true);
        }}
        onRoomsClick={() => {
          setShowRoomGallery(true);
        }}
        onArenaClick={() => {
          // TODO: открыть арену
        }}
        onGoDistrict={() => dispatch({ type: 'TOGGLE_MAP' })}
        showMap={state.showMap || tutorialMap}
        mapRaids={state.mapRaids.filter((raid) => region
          ? (region.raids as readonly string[]).includes(raid.id)
          : !EXTRA_MAP_RAIDS.some((extra) => extra.id === raid.id))}
        raidMapImage={region?.image}
        onRaidClick={handleRaidClick}
        notifications={state.notifications}
        showNotifications={state.showNotifications}
        unreadNotifications={unreadNotifications}
        onNotificationsClick={() => dispatch({ type: 'TOGGLE_NOTIFICATIONS' })}
        onNotificationRaidClick={(raidId) => {
          // Закрываем панель уведомлений и открываем окно рейда
          dispatch({ type: 'TOGGLE_NOTIFICATIONS' });
          dispatch({ type: 'OPEN_MAP_RAID', raidId });
        }}
        onNotificationRemove={(id) => dispatch({ type: 'REMOVE_NOTIFICATION', id })}
        onNotificationsClear={() => dispatch({ type: 'CLEAR_NOTIFICATIONS' })}
        playerName={`${vkUser?.first_name || 'Игрок'} ${vkUser?.last_name || ''}`.trim()}
        avatarUrl={vkUser?.photo_200}
        lastMessage={state.lastMessage}
      />


      {state.showMap && !state.showRaidModal && <>
        <div className={extraStyles.title} aria-live="polite">{region?.name ?? 'Карта районов'} · {mapPage + 1}/{RAID_REGIONS.length + 1}</div>
        {region && locked && <button type="button" className={extraStyles.closeMap} onClick={closeMapOnly}>← Назад</button>}
        {region && locked && <div className={extraStyles.lockOverlay}>
          <div className={extraStyles.chains} aria-hidden="true"><i/><i/></div>
          <div className={extraStyles.lockBox}>
            <img className={extraStyles.lockIcon} src="/icon/raids/lock.svg" alt="" aria-hidden="true" />
            <strong>Локация закрыта</strong>
            <span>Машина: {state.carLevel} / {region.carLevel} ур.</span>
            <button type="button" onClick={() => { setUnlockAttempt(true); dispatch({ type: 'UNLOCK_RAID_REGION', regionId: region.id }); }}>ОТКРЫТЬ ЛОКАЦИЮ</button>
            {unlockAttempt && state.carLevel < region.carLevel && <p role="status">Нужна машина {region.carLevel} уровня. Улучшите её в профиле.</p>}
          </div>
        </div>}
        <nav className={extraStyles.navigation} aria-label="Переключение карт рейдов">
          <button type="button" disabled={mapPage === 0} onClick={() => { setMapPage((page) => page - 1); setUnlockAttempt(false); }}>← Назад</button>
          <button type="button" disabled={mapPage === RAID_REGIONS.length} onClick={() => { setMapPage((page) => page + 1); setUnlockAttempt(false); }}>Вперёд →</button>
        </nav>
      </>}

      {showProfile && <SurvivorProfile
        onClose={closeProfileOnly}
        onWorkshop={() => navigator.push(DEFAULT_VIEW_PANELS.WORKSHOP)}
        onInventory={() => navigator.push(DEFAULT_VIEW_PANELS.INVENTORY)}
        onBosses={() => dispatch({ type: state.battle?.source === 'boss' ? 'OPEN_BATTLE' : 'TOGGLE_BOSS_MODAL' })}
        onClan={() => dispatch({ type: 'TOGGLE_CLAN_MODAL' })}
      />}

      {showLoginReward && <LoginReward onClose={() => setShowLoginReward(false)} />}
      {!isLoading && loginChecked && !showLoginReward && loginRewardStatus(state.loginRewards).available && <button type="button" className={loginStyles.reopen} onClick={() => setShowLoginReward(true)}>🎁 Награда за вход</button>}
      {showQuests && <QuestBoard onClose={() => setShowQuests(false)} />}



      {/* Панель друзей */}
      {showFriends && (
        <FriendsPanel onClose={() => setShowFriends(false)} />
      )}

      {/* Галерея комнат */}
      {showRoomGallery && (
        <RoomGallery onClose={() => setShowRoomGallery(false)} />
      )}
      {tutorialActive && tutorialPreview === 'daily' && <LoginReward onClose={() => {}} />}
      {tutorialActive && tutorialPreview === 'battle' && tutorialId && <div data-tutorial-preview="battle"><TutorialBattlePreview stepId={tutorialId} /></div>}
      {tutorialActive && tutorialPreview === 'boss' && <div data-tutorial-preview="boss"><BossHub onClose={() => {}} /></div>}
      {tutorialActive && tutorialPreview === 'arena' && <Arena onClose={() => {}} />}
      {tutorialActive && tutorialPreview === 'store' && <StoreModal onClose={() => {}} />}
      {tutorialActive && tutorialPreview === 'shelter' && <RoomModal onClose={() => {}} />}
      {tutorialActive && tutorialPreview === 'social' && <FriendsPanel onClose={() => {}} />}
      {tutorialActive && tutorialPreview === 'clan' && <ClanModal onClose={() => {}} />}
      </div>
      {tutorialActive && <Tutorial version={state.tutorialVersion} step={state.tutorialStep}
        onLocate={showTutorialPreview}
        onPractice={(stepId) => dispatch({ type: 'TUTORIAL_PRACTICE', stepId })}
        onSkip={() => dispatch({ type: 'SKIP_TUTORIAL' })} />}
    </div>
  );
};
