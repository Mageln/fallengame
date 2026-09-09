import { useState, useEffect, useCallback } from 'react';
import { useGame } from '../game/GameContext';

interface RaidModalProps {
  raidId: string;
  onClaim: () => void;
  onCancel: () => void;
}

export const RaidModal = ({ raidId, onClaim, onCancel }: RaidModalProps) => {
  const { state, dispatch } = useGame();
  const [timeLeft, setTimeLeft] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const raid = state.mapRaids.find(r => r.id === raidId);
  const activeRaid = state.activeRaid;
  
  const raidData = activeRaid || raid;
  
  const raidDuration = raidData?.type === 'yellow' ? 15 * 60 * 1000 : 30 * 60 * 1000;
  
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const updateTimer = useCallback(() => {
    if (!raidData?.endTime) return;
    
    const now = Date.now();
    const remaining = raidData.endTime - now;
    
    if (remaining <= 0) {
      setTimeLeft(0);
      setIsCompleted(true);
    } else {
      setTimeLeft(remaining);
      setIsCompleted(false);
    }
  }, [raidData]);
  
  useEffect(() => {
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [updateTimer]);
  
  if (!raidData) return null;
  
  const isRed = raidData.type === 'red';
  const borderColor = isRed ? '#ff4444' : '#ffaa00';
  const bgColor = isRed ? 'rgba(255, 68, 68, 0.1)' : 'rgba(255, 170, 0, 0.1)';
  const zoneLabel = isRed ? 'ОПАСНАЯ ЗОНА' : 'СРЕДНЯЯ ЗОНА';
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: 16,
          padding: 24,
          maxWidth: 400,
          width: '90%',
          border: `2px solid ${borderColor}`,
          boxShadow: `0 0 30px ${borderColor}40`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 20,
              background: bgColor,
              border: `1px solid ${borderColor}`,
              color: borderColor,
              fontSize: 12,
              fontWeight: 'bold',
              marginBottom: 8,
            }}
          >
            {zoneLabel}
          </div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: 20 }}>{raidData.name}</h2>
          <p style={{ margin: '8px 0 0', color: '#888', fontSize: 13 }}>{raidData.description}</p>
        </div>
        
        {/* Таймер */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: isCompleted ? '#00ff88' : borderColor,
              fontFamily: 'monospace',
              textShadow: `0 0 20px ${borderColor}80`,
            }}
          >
            {isCompleted ? '✅ ГОТОВО' : formatTime(timeLeft)}
          </div>
          <p style={{ margin: '8px 0 0', color: '#666', fontSize: 12 }}>
            {isCompleted ? 'Ресурсы готовы к получению' : 'Рейд в процессе...'}
          </p>
        </div>
        
        {/* Прогресс-бар */}
        {!isCompleted && raidData.startTime && raidData.endTime && (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                height: 8,
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${((raidData.endTime - raidData.startTime - timeLeft) / (raidData.endTime - raidData.startTime)) * 100}%`,
                  background: `linear-gradient(90deg, ${borderColor}, ${borderColor}aa)`,
                  borderRadius: 4,
                  transition: 'width 1s linear',
                }}
              />
            </div>
          </div>
        )}
        
        {/* Награды */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <h3 style={{ margin: '0 0 12px', color: '#ffd700', fontSize: 14, textAlign: 'center' }}>
            💰 Награды
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24 }}>🔫</div>
              <div style={{ color: '#ccc', fontSize: 16, fontWeight: 'bold' }}>{raidData.rewards.bullets}</div>
              <div style={{ color: '#888', fontSize: 11 }}>Пули</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24 }}>🔥</div>
              <div style={{ color: '#ff8800', fontSize: 16, fontWeight: 'bold' }}>{raidData.rewards.matches}</div>
              <div style={{ color: '#888', fontSize: 11 }}>Спички</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24 }}>⚙️</div>
              <div style={{ color: '#00aaff', fontSize: 16, fontWeight: 'bold' }}>{raidData.rewards.materials}</div>
              <div style={{ color: '#888', fontSize: 11 }}>Материалы</div>
            </div>
          </div>
        </div>
        
        {/* Кнопки */}
        <div style={{ display: 'flex', gap: 10 }}>
          {isCompleted ? (
            <button
              onClick={onClaim}
              style={{
                flex: 1,
                padding: '12px 20px',
                background: 'linear-gradient(180deg, #00ff88 0%, #00cc66 100%)',
                color: '#000',
                border: 'none',
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ✅ Получить награду
            </button>
          ) : (
            <button
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '12px 20px',
                background: 'rgba(255, 68, 68, 0.2)',
                color: '#ff6666',
                border: '1px solid #ff4444',
                borderRadius: 10,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              ❌ Отменить
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
