import { useState, useEffect } from 'react';
import { FallenCanvas } from '../components/FallenCanvas/FallenCanvas';
import { useGame } from '../game/GameContext';
import { DISTRICT_TASKS } from '../game/constants';
import { getDistrict } from '../game/formulas';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { DEFAULT_VIEW_PANELS } from '../routes';
import { RaidModal } from './RaidModal';
import { vkApiJsonp } from '../services/vkApi';

interface HomeProps {
  id: string;
  userName?: string;
}

export const Home = ({ id }: HomeProps) => {
  const navigator = useRouteNavigator();
  const { state, dispatch, derived, vkUser, isLoading } = useGame();
  const district = getDistrict(state.currentDistrict);
  const [showProfile, setShowProfile] = useState(false);
  const [activeRaid, setActiveRaid] = useState<string | null>(null);
  const [customVkToken, setCustomVkToken] = useState<string>('dd0ca6b1dd0ca6b1dd0ca6b13dde4f3e0cddd0cdd0ca6b1b7ad935eb87f55fa9d2924b6');
  const [showTokenInput, setShowTokenInput] = useState(false);

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

  // Имя пользователя из VK
  const playerName = vkUser 
    ? `${vkUser.first_name} ${vkUser.last_name}`
    : 'Игрок';

  // Проверка ключа доступа через JSONP (обход CORS)
  const loadUserWithToken = async () => {
    if (!customVkToken.trim()) {
      alert('Введите ключ доступа');
      return;
    }
    
    try {
      const data = await vkApiJsonp('users.get', {
        user_ids: 'self',
        access_token: customVkToken,
        v: '5.131',
        fields: 'photo_200',
      });
      
      if (data.error) {
        alert(`Ошибка VK API: ${data.error.error_msg}`);
        return;
      }
      
      if (data.response && data.response.length > 0) {
        // Сохраняем токен и перезагружаем страницу —
        // getVkUser() подхватит токен из localStorage
        localStorage.setItem('vk_token', customVkToken);
        window.location.reload();
      } else {
        alert('Не удалось получить данные пользователя');
      }
    } catch (error) {
      alert('Ошибка подключения: ' + error);
    }
  };

  // Загружаем токен из localStorage при инициализации
  useEffect(() => {
    const savedToken = localStorage.getItem('vk_token');
    if (savedToken) {
      setCustomVkToken(savedToken);
    }
  }, []);

  // Собираем данные профиля для canvas
  const profileData = {
    level: state.level,
    stamina: derived.stamina,
    damage: derived.damage,
    luck: derived.luck,
    crit: derived.crit,
    gold: state.gold,
    spicki: state.matches,
    bullets: state.bullets,
    zhetons: state.zhetons,
    appearance: state.appearance,
    carLevel: state.carLevel,
    weapon: {
      name: state.weapon.name,
      level: state.weapon.level,
      broken: state.weapon.broken,
    },
  };

  // Обработчики для рейдов
  const handleRaidClick = (raidId: string) => {
    dispatch({ type: 'START_RAID', raidId });
  };

  const handleClaimRaid = () => {
    if (activeRaid) {
      dispatch({ type: 'CLAIM_RAID_REWARD', raidId: activeRaid });
      setActiveRaid(null);
    }
  };

  const handleCancelRaid = () => {
    if (activeRaid) {
      dispatch({ type: 'CANCEL_RAID', raidId: activeRaid });
      setActiveRaid(null);
    }
  };

  return (
    <div id={id} style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Панель ввода токена */}
      {showTokenInput && (
        <div style={{
          position: 'absolute',
          top: 80,
          right: 10,
          zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.9)',
          border: '2px solid #ffd700',
          borderRadius: 10,
          padding: 15,
          minWidth: 300,
          color: '#fff',
          fontFamily: 'Arial, sans-serif',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ margin: 0, color: '#ffd700', fontSize: 14 }}>🔑 Ключ доступа VK</h3>
            <button
              onClick={() => setShowTokenInput(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: 18,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
          
          <p style={{ fontSize: 11, color: '#aaa', marginBottom: 10 }}>
            Введите защищённый ключ или сервисный ключ для тестирования
          </p>
          
          <input
            type="text"
            value={customVkToken}
            onChange={(e) => setCustomVkToken(e.target.value)}
            placeholder="Введите ключ доступа..."
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: 12,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid #555',
              borderRadius: 5,
              color: '#fff',
              marginBottom: 10,
              boxSizing: 'border-box',
            }}
          />
          
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={loadUserWithToken}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: 12,
                background: '#ffd700',
                color: '#000',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              ✓ Загрузить
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('vk_token');
                setCustomVkToken('');
                window.location.reload();
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: 12,
                background: '#cc3333',
                color: '#fff',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              ✕ Очистить
            </button>
          </div>
          
          <div style={{ marginTop: 10, fontSize: 10, color: '#888' }}>
            <strong>Где взять ключ:</strong><br/>
            1. dev.vk.com → ваше приложение<br/>
            2. Настройки → Ключ доступа<br/>
            3. Скопировать и вставить сюда
          </div>
        </div>
      )}
      
      {/* Кнопка открытия панели токена */}
      <button
        onClick={() => setShowTokenInput(!showTokenInput)}
        style={{
          position: 'absolute',
          top: 65,
          right: 10,
          zIndex: 1000,
          padding: '6px 12px',
          fontSize: 11,
          background: showTokenInput ? '#ffd700' : 'rgba(0, 0, 0, 0.7)',
          color: showTokenInput ? '#000' : '#fff',
          border: '1px solid #ffd700',
          borderRadius: 5,
          cursor: 'pointer',
        }}
      >
        🔑 {showTokenInput ? 'Скрыть' : 'Ключ VK'}
      </button>
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
        onGoClan={() => navigator.push(DEFAULT_VIEW_PANELS.CLAN)}
        onGoInventory={() => navigator.push(DEFAULT_VIEW_PANELS.INVENTORY)}
        onGoQuests={() => navigator.push(DEFAULT_VIEW_PANELS.QUESTS)}
        onGoCrafting={() => navigator.push(DEFAULT_VIEW_PANELS.CRAFTING)}
        onLottery={() => dispatch({ type: 'LOTTERY' })}
        onClaimDaily={() => dispatch({ type: 'CLAIM_DAILY' })}
        onOpenBossModal={() => dispatch({ type: 'TOGGLE_BOSS_MODAL' })}
        onCloseMap={closeMapOnly}
        showProfile={showProfile}
        profileData={profileData}
        onProfileClose={closeProfileOnly}
        onCloseProfile={closeProfileOnly}
        onBattleClick={() => {
          district && openBattle(district.id);
        }}
        onFriendsClick={() => {
          navigator.push(DEFAULT_VIEW_PANELS.CLAN);
        }}
        onArenaClick={() => {
          // TODO: открыть арену
        }}
        onGoDistrict={() => dispatch({ type: 'TOGGLE_MAP' })}
        showMap={state.showMap}
        mapRaids={state.mapRaids}
        onRaidClick={handleRaidClick}
        playerName={`${vkUser?.first_name || 'Игрок'} ${vkUser?.last_name || ''}`.trim()}
        avatarUrl={vkUser?.photo_200}
      />
    </div>
  );
};
