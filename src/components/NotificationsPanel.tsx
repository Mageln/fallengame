import { GameNotification } from '../game/types';

interface NotificationsPanelProps {
  notifications: GameNotification[];
  onClose: () => void;
  // Клик по уведомлению о рейде — открыть окно этого рейда
  onRaidClick?: (raidId: string) => void;
  // Удалить конкретное уведомление (крестик)
  onRemove?: (id: string) => void;
  // Очистить весь список
  onClearAll?: () => void;
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const NotificationsPanel = ({
  notifications,
  onClose,
  onRaidClick,
  onRemove,
  onClearAll,
}: NotificationsPanelProps) => {
  return (
    <>
      {/* Прозрачная подложка: клик вне панели закрывает её */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'transparent' }}
      />
      <div
        style={{
          position: 'fixed',
          top: 60,
          right: 10,
          width: 300,
          maxWidth: 'calc(100vw - 20px)',
          maxHeight: '60vh',
          overflowY: 'auto',
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          border: '2px solid #ffd700',
          borderRadius: 12,
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
          zIndex: 9001,
          padding: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ color: '#ffd700', fontWeight: 'bold', fontSize: 14 }}>🔔 Уведомления</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {notifications.length > 0 && onClearAll && (
              <button
                onClick={onClearAll}
                title="Очистить все уведомления"
                style={{
                  background: 'transparent',
                  border: '1px solid #666',
                  color: '#aaa',
                  fontSize: 10,
                  borderRadius: 6,
                  padding: '3px 8px',
                  cursor: 'pointer',
                }}
              >
                Очистить все
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: 16,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
            Пока нет уведомлений
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                marginBottom: 6,
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 215, 0, 0.25)',
                borderRadius: 8,
              }}
            >
              <div>
                <div style={{ color: '#eee', fontSize: 12 }}>{notification.text}</div>
                <div style={{ color: '#777', fontSize: 10, marginTop: 2 }}>{formatTime(notification.createdAt)}</div>
              </div>
              {notification.raidId && onRaidClick && (
                <button
                  onClick={() => onRaidClick(notification.raidId!)}
                  style={{
                    flexShrink: 0,
                    padding: '5px 10px',
                    background: 'linear-gradient(180deg, #ffd700 0%, #cc9900 100%)',
                    color: '#000',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Забрать
                </button>
              )}
              {onRemove && (
                <button
                  onClick={() => onRemove(notification.id)}
                  title="Удалить уведомление"
                  style={{
                    flexShrink: 0,
                    width: 22,
                    height: 22,
                    background: 'rgba(255, 68, 68, 0.15)',
                    border: '1px solid #ff4444',
                    color: '#ff6666',
                    borderRadius: 6,
                    fontSize: 12,
                    lineHeight: 1,
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
};
