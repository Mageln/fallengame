import { useEffect, useState } from 'react';
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
import { loginRewardStatus } from '../game/loginRewards';
import loginStyles from '../style/LoginReward.module.scss';

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

  // Открываем окно только после загрузки сохранения пользователя.
  useEffect(() => {
    if (isLoading || loginChecked) return;
    setLoginChecked(true);
    if (loginRewardStatus(state.loginRewards).available) setShowLoginReward(true);
  }, [isLoading, loginChecked, state.loginRewards]);

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
        showMap={state.showMap}
        mapRaids={state.mapRaids}
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
    </div>
  );
};
