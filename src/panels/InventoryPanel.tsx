import { useState } from 'react';

const TABS = [
  { id: 'inventory', label: 'Инвентарь' },
  { id: 'news', label: 'Новости' },
  { id: 'skills', label: 'Навыки' },
  { id: 'summary', label: 'Сводка' },
  { id: 'collections', label: 'Коллекции' },
  { id: 'achievements', label: 'Достижения' },
];

const KEY_ITEMS = [
  { id: 1, name: 'Ржавый ключ', icon: '🗝️', count: 3 },
  { id: 2, name: 'Ключ от подвала', icon: '🔑', count: 1 },
  { id: 3, name: 'Карта', icon: '🗺️', count: 2 },
];

const AMMO_ITEMS = [
  { id: 1, name: 'Патроны 9мм', icon: '🔫', count: 45 },
  { id: 2, name: 'Патроны 12к', icon: '🔫', count: 12 },
  { id: 3, name: 'Бронебойные', icon: '💥', count: 5 },
  { id: 4, name: 'Сигнальные', icon: '🎆', count: 2 },
];

const TOOL_ITEMS = [
  { id: 1, name: 'Отвёртка', icon: '🪛', count: 1 },
  { id: 2, name: 'Монтировка', icon: '🔧', count: 1 },
  { id: 3, name: 'Паяльная лампа', icon: '🔥', count: 1 },
  { id: 4, name: 'Мед. набор', icon: '💊', count: 3 },
  { id: 5, name: 'Фонарик', icon: '🔦', count: 2 },
];

interface InventoryPanelProps {
  onClose: () => void;
}

export const InventoryPanel = ({ onClose }: InventoryPanelProps) => {
  const [activeTab, setActiveTab] = useState('inventory');

  const renderContent = () => {
    switch (activeTab) {
      case 'inventory':
        return (
          <>
            <InventorySection title="Ключи" items={KEY_ITEMS} />
            <InventorySection title="Амуниция" items={AMMO_ITEMS} />
            <InventorySection title="Инструменты" items={TOOL_ITEMS} />
          </>
        );
      case 'news':
        return <EmptySection title="Новости" message="Нет новых новостей" />;
      case 'skills':
        return <EmptySection title="Навыки" message="Навыки будут доступны позже" />;
      case 'summary':
        return <EmptySection title="Сводка" message="Сводка данных" />;
      case 'collections':
        return <EmptySection title="Коллекции" message="Коллекции пока пусты" />;
      case 'achievements':
        return <EmptySection title="Достижения" message="Достижения пока недоступны" />;
      default:
        return null;
    }
  };

  return (
    <div style={{
      width: '100%',
      minHeight: 600,
      background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      borderRadius: 12,
      overflow: 'hidden',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      position: 'relative',
    }}>
      {/* Заголовок с кнопкой закрытия */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: 'rgba(0, 0, 0, 0.4)',
        borderBottom: '2px solid rgba(255, 165, 0, 0.3)',
      }}>
        <span style={{ color: '#e8a849', fontSize: 18, fontWeight: 'bold', textShadow: '0 0 10px rgba(232, 168, 73, 0.5)' }}>
          📋 Инвентарь
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 80, 80, 0.2)',
            border: '1px solid rgba(255, 80, 80, 0.4)',
            borderRadius: 6,
            color: '#ff6b6b',
            cursor: 'pointer',
            padding: '4px 10px',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ✕
          Закрыть
        </button>
      </div>

      {/* Вкладки */}
      <div style={{
        display: 'flex',
        gap: 4,
        padding: '10px 12px 0',
        background: 'rgba(0, 0, 0, 0.2)',
        overflowX: 'auto',
        flexWrap: 'wrap',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id
                ? 'linear-gradient(180deg, rgba(232, 168, 73, 0.4) 0%, rgba(232, 168, 73, 0.1) 100%)'
                : 'rgba(255, 255, 255, 0.05)',
              border: activeTab === tab.id
                ? '1px solid rgba(232, 168, 73, 0.6)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 6,
              color: activeTab === tab.id ? '#e8a849' : 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 600 : 400,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Контент с фоном пробковой доски */}
      <div style={{
        padding: 16,
        background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"), linear-gradient(180deg, #2d1b0e 0%, #3d2817 30%, #4a3220 60%, #3d2817 100%)',
        borderRadius: 0,
        minHeight: 350,
        boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.5)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        {renderContent()}
      </div>
    </div>
  );
};

interface InventorySectionProps {
  title: string;
  items: { id: number; name: string; icon: string; count: number }[];
}

const InventorySection = ({ title, items }: InventorySectionProps) => {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
      }}>
        <div style={{
          width: 4,
          height: 20,
          background: 'linear-gradient(180deg, #e8a849 0%, #c47f20 100%)',
          borderRadius: 2,
          boxShadow: '0 0 8px rgba(232, 168, 73, 0.4)',
        }} />
        <h3 style={{
          margin: 0,
          color: '#e8a849',
          fontSize: 16,
          fontWeight: 600,
          textShadow: '0 0 10px rgba(232, 168, 73, 0.3)',
          letterSpacing: 0.5,
        }}>
          {title}
        </h3>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 12,
        background: 'rgba(0, 0, 0, 0.25)',
        borderRadius: 8,
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 6,
              border: '1px solid rgba(255, 255, 255, 0.06)',
              transition: 'background 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 14 }}>
                {item.name}
              </span>
            </div>
            <span style={{
              color: '#e8a849',
              fontSize: 14,
              fontWeight: 600,
              background: 'rgba(232, 168, 73, 0.15)',
              padding: '2px 8px',
              borderRadius: 10,
            }}>
              x{item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const EmptySection = ({ title, message }: { title: string; message: string }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 250,
      gap: 12,
    }}>
      <div style={{
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 28,
        opacity: 0.4,
      }}>
        📦
      </div>
      <h3 style={{
        margin: 0,
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 16,
        fontWeight: 500,
      }}>
        {title}
      </h3>
      <p style={{
        margin: 0,
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 13,
        textAlign: 'center',
        maxWidth: 250,
      }}>
        {message}
      </p>
    </div>
  );
};
