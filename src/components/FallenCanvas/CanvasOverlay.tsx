import { Button } from '@vkontakte/vkui';
import { LOCATIONS } from '../../game/constants';

interface Props {
  currentLocation: string;
  currentDistrict: string;
  carLevel: number;
  level: number;
  energy: number;
  maxEnergy: number;
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

  const btnBase: React.CSSProperties = {
    fontSize: 11,
    padding: '4px 2px',
    borderRadius: 6,
    border: '1px solid #444',
    cursor: 'pointer',
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      zIndex: 5,
    }}>
      {/* === ВЕРХНЯЯ ПАНЕЛЬ === */}
      <div style={{
        pointerEvents: 'auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
      }}>
        {/* Профиль + уровень */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            size="s"
            mode="tertiary"
            style={{ ...btnBase, background: 'rgba(0,0,0,0.6)', color: '#fff' }}
            onClick={onGoProfile}
          >
            👤
          </Button>
          <span style={{ color: '#ffd700', fontSize: 12, fontWeight: 'bold' }}>
            ур. {level}
          </span>
          <span style={{ color: '#888', fontSize: 10 }}>
            ⚡ {energy}/{maxEnergy}
          </span>
        </div>

        {/* Название локации и района */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#00ff88', fontSize: 13, fontWeight: 'bold' }}>
            🏠 {location?.name || 'Локация ' + locIndex}
          </div>
          <div style={{ color: '#ff6666', fontSize: 11 }}>
            🗺️ Эргейт — {districtName}
          </div>
        </div>

        {/* Карта + Звук */}
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            size="s"
            mode="tertiary"
            style={{ ...btnBase, background: 'rgba(0,0,0,0.6)', color: '#ffd700' }}
            onClick={onToggleMap}
          >
            🗺️
          </Button>
          <Button
            size="s"
            mode="tertiary"
            style={{ ...btnBase, background: 'rgba(0,0,0,0.6)', color: soundEnabled ? '#00ff88' : '#666' }}
            onClick={onToggleSound}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </Button>
        </div>
      </div>

      {/* === ПЕРЕКЛЮЧАТЕЛЬ ЛОКАЦИЙ === */}
      <div style={{
        pointerEvents: 'auto',
        position: 'absolute',
        top: 45,
        left: 12,
        display: 'flex',
        gap: 4,
      }}>
        <Button
          size="s"
          mode="tertiary"
          style={{ ...btnBase, background: 'rgba(0,0,0,0.7)', border: '1px solid #00ff88', color: '#00ff88', fontSize: 16 }}
          onClick={() => onChangeLocation(prevLoc)}
        >
          ◀
        </Button>
        <Button
          size="s"
          mode="tertiary"
          style={{ ...btnBase, background: 'rgba(0,0,0,0.7)', border: '1px solid #00ff88', color: '#00ff88', fontSize: 16 }}
          onClick={() => onChangeLocation(nextLoc)}
        >
          ▶
        </Button>
      </div>

      {/* === ПЕРЕКЛЮЧАТЕЛЬ РАЙОНОВ === */}
      <div style={{
        pointerEvents: 'auto',
        position: 'absolute',
        top: 45,
        right: 12,
        display: 'flex',
        gap: 4,
        flexWrap: 'wrap',
        maxWidth: '45%',
      }}>
        {lockedDistricts.slice(0, 3).map(d => (
          <Button
            key={d.id}
            size="s"
            disabled={d.carLevel > carLevel}
            style={{
              ...btnBase,
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
      <div style={{
        pointerEvents: 'auto',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '8px 10px 12px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
      }}>
        {/* Ряд 1: Основные действия */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <Button
            size="s"
            style={{
              ...btnBase,
              flex: 1,
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
            style={{
              ...btnBase,
              flex: 1,
              background: 'linear-gradient(135deg, #1a1a2e, #0d0d1a)',
              border: '1px solid #ff6666',
              color: '#ff6666',
            }}
            onClick={onBattle}
          >
            ⚔️ Босс
          </Button>
          <Button
            size="s"
            style={{
              ...btnBase,
              flex: 1,
              background: 'linear-gradient(135deg, #1a2e1a, #0d1a0d)',
              border: '1px solid #00ff88',
              color: '#00ff88',
            }}
            onClick={onGoWorkshop}
          >
            🔧 Цех
          </Button>
        </div>

        {/* Ряд 2: Рейды и клан */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <Button
            size="s"
            style={{
              ...btnBase,
              flex: 1,
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
            style={{
              ...btnBase,
              flex: 1,
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid #ff8800',
              color: '#ff8800',
            }}
            onClick={onGoClan}
          >
            👥 Клан
          </Button>
          <Button
            size="s"
            style={{
              ...btnBase,
              flex: 1,
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
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <Button
            size="s"
            disabled={completedQuests === 0}
            style={{
              ...btnBase,
              flex: 1,
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
            style={{
              ...btnBase,
              flex: 1,
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
            style={{
              ...btnBase,
              flex: 1,
              background: 'rgba(0,0,0,0.7)',
              border: daily.lotteryUsed ? '#333' : '#ffd700',
              color: daily.lotteryUsed ? '#555' : '#ffd700',
            }}
            onClick={onLottery}
          >
            🎰 Лотерея
          </Button>
        </div>

        {/* Ряд 4: Доп. действия */}
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            size="s"
            disabled={daily.goldClaimed}
            style={{
              ...btnBase,
              flex: 1,
              background: 'rgba(0,0,0,0.7)',
              border: daily.goldClaimed ? '#333' : '#ffd700',
              color: daily.goldClaimed ? '#555' : '#ffd700',
              fontSize: 10,
              padding: '3px 2px',
            }}
            onClick={onClaimDaily}
          >
            💰 Золото
          </Button>
          <Button
            size="s"
            style={{
              ...btnBase,
              flex: 1,
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid #666',
              color: '#aaa',
              fontSize: 10,
              padding: '3px 2px',
            }}
            onClick={onSearchFriend}
          >
            🔍 Обыск
          </Button>
          <Button
            size="s"
            style={{
              ...btnBase,
              flex: 1,
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid #666',
              color: radioRequests > 0 ? '#ff4444' : '#aaa',
              fontSize: 10,
              padding: '3px 2px',
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
