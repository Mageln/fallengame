import { Button } from '@vkontakte/vkui';
import { LOCATIONS } from '../../game/constants';
import { ButtonIconSrc } from '../../hooks/useIcon';
import '../../style/responsive.scss';

interface Props {
  currentLocation: string;
  currentDistrict: string;
  carLevel: number;
  level: number;
  energy: number;
  maxEnergy: number;
  iconSrcs: ButtonIconSrc;
  onToggleMap: () => void;
  onChangeLocation: (locId: string) => void;
  onEnterDistrict: (districtId: string) => void;
  onUpgradeCar: () => void;
  onToggleSound: () => void;
  soundEnabled: boolean;
  onGoProfile: () => void;
  onGoWorkshop: () => void;
  onGoRaid: () => void;
  onGoClan: () => void;
  onGoInventory: () => void;
  onGoQuests: () => void;
  onGoCrafting: () => void;
  onLottery: () => void;
  onClaimDaily: () => void;
  onSearchFriend: () => void;
  onRadioHelp: () => void;
  onBattle: () => void;
  districtName: string;
  lockedDistricts: { id: string; name: string; carLevel: number }[];
  completedQuests: number;
  radioRequests: number;
  daily: { lotteryUsed: boolean; goldClaimed: boolean };
}

export const CanvasOverlay: React.FC<Props> = ({
  currentLocation,
  currentDistrict,
  carLevel,
  level,
  energy,
  maxEnergy,
  iconSrcs,
  onToggleMap,
  onChangeLocation,
  onEnterDistrict,
  onUpgradeCar,
  onToggleSound,
  soundEnabled,
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
  onBattle,
  districtName,
  lockedDistricts,
  completedQuests,
  radioRequests,
  daily,
}) => {
  const location = LOCATIONS.find(l => l.id === currentLocation);
  const locIndex = parseInt(currentLocation.replace('location', '')) || 1;
  const prevLoc = `location${locIndex > 1 ? locIndex - 1 : 5}`;
  const nextLoc = `location${locIndex < 5 ? locIndex + 1 : 1}`;

  const iconSize = 18;

  const renderIcon = (src: string | null, fallback: string) => {
    if (src) {
      return <img src={src} alt="" style={{ width: iconSize, height: iconSize, objectFit: 'contain' }} />;
    }
    return fallback;
  };

  return (
    <div className="canvas-overlay">
      {/* === ВЕРХНЯЯ ПАНЕЛЬ === */}
      <div className="overlay-topbar">
        {/* Профиль + уровень */}
        <div className="topbar-left">
          <Button
            size="s"
            mode="tertiary"
            className="profile-btn"
            onClick={onGoProfile}
          >
            {renderIcon(iconSrcs.personaz, '👤')}
          </Button>
          <span className="level-text">
            ур. {level}
          </span>
          <span className="energy-text">
            ⚡ {energy}/{maxEnergy}
          </span>
        </div>

        {/* Название локации и района */}
        <div className="topbar-center">
          <div className="location-name">
            🏠 {location?.name || 'Локация ' + locIndex}
          </div>
          <div className="district-name">
            🗺️ Эргейт — {districtName}
          </div>
        </div>

        {/* Карта + Звук */}
        <div className="topbar-right">
          <Button
            size="s"
            mode="tertiary"
            className="icon-btn"
            style={{ color: '#ffd700' }}
            onClick={onToggleMap}
          >
            {renderIcon(iconSrcs.arena, '🗺️')}
          </Button>
          <Button
            size="s"
            mode="tertiary"
            className="sound-btn"
            style={{ color: soundEnabled ? '#00ff88' : '#666' }}
            onClick={onToggleSound}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </Button>
        </div>
      </div>

      {/* === ПЕРЕКЛЮЧАТЕЛЬ ЛОКАЦИЙ === */}
      <div className="location-switcher">
        <Button
          size="s"
          mode="tertiary"
          className="loc-btn"
          onClick={() => onChangeLocation(prevLoc)}
        >
          ◀
        </Button>
        <Button
          size="s"
          mode="tertiary"
          className="loc-btn"
          onClick={() => onChangeLocation(nextLoc)}
        >
          ▶
        </Button>
      </div>

      {/* === ПЕРЕКЛЮЧАТЕЛЬ РАЙОНОВ === */}
      <div className="district-switcher">
        {lockedDistricts.slice(0, 3).map(d => (
          <Button
            key={d.id}
            size="s"
            disabled={d.carLevel > carLevel}
            className="dist-btn"
            style={{
              fontSize: 9,
              padding: '2px 6px',
              background: currentDistrict === d.id ? 'rgba(255,215,0,0.3)' : 'rgba(0,0,0,0.7)',
              border: `1px solid ${d.carLevel > carLevel ? '#333' : '#ff6666'}`,
              color: d.carLevel > carLevel ? '#666' : '#fff',
            }}
            onClick={() => onEnterDistrict(d.id)}
          >
            {d.name}
          </Button>
        ))}
      </div>

      {/* === НИЖНЯЯ ПАНЕЛЬ === */}
      <div className="overlay-bottombar">
        {/* Ряд 1: Основные действия */}
        <div className="bottombar-row">
          <Button
            size="s"
            className="bottombar-btn"
            style={{
              background: 'linear-gradient(135deg, #2d1515, #1a0a0a)',
              border: '1px solid #666',
              color: '#ffd700',
            }}
            onClick={onUpgradeCar}
          >
            🚗 Авто {carLevel}
          </Button>
          <Button
            size="s"
            className="bottombar-btn"
            style={{
              background: 'linear-gradient(135deg, #1a1a2e, #0d0d1a)',
              border: '1px solid #ff6666',
              color: '#ff6666',
            }}
            onClick={onBattle}
          >
            {renderIcon(iconSrcs.boss, '⚔️')} Босс
          </Button>
          <Button
            size="s"
            className="bottombar-btn"
            style={{
              background: 'linear-gradient(135deg, #1a2e1a, #0d1a0d)',
              border: '1px solid #00ff88',
              color: '#00ff88',
            }}
            onClick={onGoWorkshop}
          >
            {renderIcon(iconSrcs.cloth, '🔧')} Цех
          </Button>
        </div>

        {/* Ряд 2: Рейды и клан */}
        <div className="bottombar-row">
          <Button
            size="s"
            className="bottombar-btn"
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid #00aaff',
              color: '#00aaff',
            }}
            onClick={onGoRaid}
          >
            📦 Рейды
          </Button>
          <Button
            size="s"
            className="bottombar-btn"
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid #ff8800',
              color: '#ff8800',
            }}
            onClick={onGoClan}
          >
            {renderIcon(iconSrcs.clans, '👥')} Клан
          </Button>
          <Button
            size="s"
            className="bottombar-btn"
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid #a335ee',
              color: '#a335ee',
            }}
            onClick={onGoInventory}
          >
            🎒 Инвентарь
          </Button>
        </div>

        {/* Ряд 3: Квесты, крафт, лотерея */}
        <div className="bottombar-row">
          <Button
            size="s"
            disabled={completedQuests === 0}
            className="bottombar-btn"
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid #eab308',
              color: completedQuests > 0 ? '#eab308' : '#555',
            }}
            onClick={onGoQuests}
          >
            📋 Квесты ({completedQuests})
          </Button>
          <Button
            size="s"
            className="bottombar-btn"
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid #8b7355',
              color: '#8b7355',
            }}
            onClick={onGoCrafting}
          >
            🔨 Крафт
          </Button>
          <Button
            size="s"
            disabled={daily.lotteryUsed}
            className="bottombar-btn"
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: daily.lotteryUsed ? '#333' : '#ffd700',
              color: daily.lotteryUsed ? '#555' : '#ffd700',
            }}
            onClick={onLottery}
          >
            {renderIcon(iconSrcs.kazino, '🎰')} Лотерея
          </Button>
        </div>

        {/* Ряд 4: Доп. действия */}
        <div className="bottombar-row">
          <Button
            size="s"
            disabled={daily.goldClaimed}
            className="bottombar-btn small-btn"
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: daily.goldClaimed ? '#333' : '#ffd700',
              color: daily.goldClaimed ? '#555' : '#ffd700',
            }}
            onClick={onClaimDaily}
          >
            {renderIcon(iconSrcs.gold, '💰')} Золото
          </Button>
          <Button
            size="s"
            className="bottombar-btn small-btn"
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid #666',
              color: '#aaa',
            }}
            onClick={onSearchFriend}
          >
            🔍 Обыск
          </Button>
          <Button
            size="s"
            className="bottombar-btn small-btn"
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid #666',
              color: radioRequests > 0 ? '#ff4444' : '#aaa',
            }}
            onClick={onRadioHelp}
          >
            📻 Рация ({radioRequests})
          </Button>
        </div>
      </div>
    </div>
  );
};
