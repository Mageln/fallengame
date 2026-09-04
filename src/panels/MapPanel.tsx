import { Button, Text, Box } from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { useState, useEffect } from 'react';
import { useGame } from '../game/GameContext';
import '../style/responsive.scss';

interface Props {
  id: string;
  showMap: boolean;
  onCloseMap: () => void;
}

// Boss marker position on map (percentage of map image)
interface BossMarker {
  districtId: string;
  x: number; // percentage 0-100
  y: number;
  name: string;
  bossName: string;
  locked: boolean;
}

const BOSS_MARKERS: BossMarker[] = [
  { districtId: 'southgate', x: 50, y: 80, name: 'Саутгейт', bossName: 'Житель', locked: false },
  { districtId: 'westend', x: 30, y: 60, name: 'Вестенд', bossName: 'Горожанин', locked: false },
  { districtId: 'market', x: 55, y: 45, name: 'Рынок', bossName: 'Злой Горожанин', locked: false },
  { districtId: 'norted', x: 25, y: 30, name: 'Нортед', bossName: 'Полицейский', locked: false },
  { districtId: 'industrial', x: 75, y: 20, name: 'Промзона', bossName: 'Мародёр', locked: false },
  { districtId: 'docks', x: 85, y: 65, name: 'Доки', bossName: 'Контрабандист', locked: false },
  { districtId: 'cathedral', x: 40, y: 15, name: 'Собор', bossName: 'Проповедник', locked: false },
  { districtId: 'mansion', x: 15, y: 50, name: 'Усадьба', bossName: 'Аристократ', locked: false },
  { districtId: 'military', x: 60, y: 8, name: 'Военная база', bossName: 'Генерал', locked: false },
];

// Infection zones (circular areas with infection level)
interface InfectionZone {
  x: number;
  y: number;
  radius: number;
  level: 'low' | 'medium' | 'high' | 'extreme';
  name: string;
}

const INFECTION_ZONES: InfectionZone[] = [
  { x: 50, y: 80, radius: 15, level: 'low', name: 'Саутгейт — слабое заражение' },
  { x: 30, y: 60, radius: 12, level: 'low', name: 'Вестенд — слабое заражение' },
  { x: 55, y: 45, radius: 18, level: 'medium', name: 'Рынок — среднее заражение' },
  { x: 25, y: 30, radius: 14, level: 'medium', name: 'Нортед — среднее заражение' },
  { x: 75, y: 20, radius: 20, level: 'high', name: 'Промзона — высокое заражение' },
  { x: 85, y: 65, radius: 16, level: 'high', name: 'Доки — высокое заражение' },
  { x: 40, y: 15, radius: 18, level: 'extreme', name: 'Собор — экстремальное заражение' },
  { x: 15, y: 50, radius: 12, level: 'medium', name: 'Усадьба — среднее заражение' },
  { x: 60, y: 8, radius: 22, level: 'extreme', name: 'Военная база — экстремальное заражение' },
];

const LEVEL_COLORS: Record<string, string> = {
  low: 'rgba(34, 197, 94, 0.25)',
  medium: 'rgba(234, 179, 8, 0.3)',
  high: 'rgba(249, 115, 22, 0.35)',
  extreme: 'rgba(239, 68, 68, 0.4)',
};

const LEVEL_BORDER: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  extreme: '#ef4444',
};

export const MapPanel = ({ id, showMap, onCloseMap }: Props) => {
  const navigator = useRouteNavigator();
  const { state } = useGame();
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<BossMarker | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setMapImage(img);
    img.onerror = () => setMapImage(null);
    img.src = '/map/map.jpg';
  }, []);

  const handleMarkerClick = (marker: BossMarker) => {
    setSelectedMarker(marker);
  };

  const handleNavigateToDistrict = (districtId: string) => {
    navigator.push('/');
    // Dispatch ENTER_DISTRICT
    // We need to access dispatch, but MapPanel doesn't have it. 
    // Let's just close the map and user can navigate manually.
  };

  if (!showMap) return null;

  return (
    <Box style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    }}>
      <Box style={{
        position: 'relative',
        maxWidth: 900,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        borderRadius: 16,
        border: '2px solid #333',
      }}>
        {/* Header */}
        <Box style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: '#1a1a2e',
          borderRadius: '16px 16px 0 0',
        }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#ffd700' }}>
            🗺️ Карта Эргейта
          </Text>
          <Button
            size="s"
            mode="tertiary"
            onClick={() => { onCloseMap(); setSelectedMarker(null); }}
          >
            ✕ Закрыть
          </Button>
        </Box>

        {/* Map */}
        <Box style={{ position: 'relative', background: '#111' }}>
          {mapImage ? (
            <img
              src="/map/map.jpg"
              alt="Карта Эргейта"
              style={{ width: '100%', display: 'block', borderRadius: '0 0 16px 16px' }}
            />
          ) : (
            <Box style={{
              width: '100%',
              aspectRatio: '16/9',
              background: 'linear-gradient(135deg, #1a0a0a, #2d1515, #0d0d0d)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '0 0 16px 16px',
            }}>
              <Text style={{ opacity: 0.5 }}>Карта города</Text>
            </Box>
          )}

          {/* Infection zones overlay */}
          {mapImage && INFECTION_ZONES.map((zone, i) => (
            <Box
              key={i}
              style={{
                position: 'absolute',
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.radius * 2}%`,
                height: `${zone.radius * 2}%`,
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: LEVEL_COLORS[zone.level],
                border: `2px solid ${LEVEL_BORDER[zone.level]}`,
                cursor: 'help',
                transition: 'all 0.3s ease',
              }}
              title={zone.name}
            />
          ))}

          {/* Boss markers */}
          {mapImage && BOSS_MARKERS.map((marker) => {
            const isUnlocked = state.unlockedDistricts.includes(marker.districtId);
            const isCurrent = state.currentDistrict === marker.districtId;
            return (
              <Box
                key={marker.districtId}
                onClick={() => handleMarkerClick(marker)}
                style={{
                  position: 'absolute',
                  left: `${marker.x}%`,
                  top: `${marker.y}%`,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              >
                <Box style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: isCurrent ? '#ffd700' : isUnlocked ? '#ef4444' : '#555',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: 18,
                  border: `3px solid ${isCurrent ? '#fff' : isUnlocked ? '#ff6666' : '#333'}`,
                  boxShadow: isCurrent ? '0 0 12px #ffd700' : '0 2px 4px rgba(0,0,0,0.5)',
                  transition: 'all 0.2s ease',
                }}>
                  💀
                </Box>
                <Box style={{
                  position: 'absolute',
                  top: 40,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  background: 'rgba(0,0,0,0.8)',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  color: isUnlocked ? '#fff' : '#888',
                  border: `1px solid ${isUnlocked ? '#ef4444' : '#333'}`,
                }}>
                  {marker.name}
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Legend */}
        <Box style={{
          padding: '12px 16px',
          background: '#1a1a2e',
          borderRadius: '0 0 16px 16px',
        }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 13 }}>Легенда:</Text>
          <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11 }}>
            <Box style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Box style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', border: '2px solid #ff6666' }} />
              <Text>Босс (открыт)</Text>
            </Box>
            <Box style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Box style={{ width: 12, height: 12, borderRadius: '50%', background: '#555', border: '2px solid #333' }} />
              <Text>Босс (закрыт)</Text>
            </Box>
            <Box style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Box style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffd700', border: '2px solid #fff' }} />
              <Text>Текущий район</Text>
            </Box>
            <Box style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Box style={{ width: 12, height: 12, borderRadius: '50%', background: LEVEL_COLORS.low }} />
              <Text>Низкое заражение</Text>
            </Box>
            <Box style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Box style={{ width: 12, height: 12, borderRadius: '50%', background: LEVEL_COLORS.high }} />
              <Text>Высокое заражение</Text>
            </Box>
            <Box style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Box style={{ width: 12, height: 12, borderRadius: '50%', background: LEVEL_COLORS.extreme }} />
              <Text>Экстремальное</Text>
            </Box>
          </Box>
        </Box>

        {/* Selected marker info */}
        {selectedMarker && (
          <Box style={{
            padding: '12px 16px',
            background: '#0d0d1a',
            borderTop: '1px solid #333',
          }}>
            <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Text style={{ fontWeight: 'bold', fontSize: 14 }}>{selectedMarker.name}</Text>
                <Text style={{ fontSize: 12, opacity: 0.7 }}>Босс: {selectedMarker.bossName}</Text>
                <Text style={{ fontSize: 11, color: state.unlockedDistricts.includes(selectedMarker.districtId) ? '#22c55e' : '#ef4444' }}>
                  {state.unlockedDistricts.includes(selectedMarker.districtId) ? '✅ Открыт' : '🔒 Закрыт'}
                </Text>
              </Box>
              <Button
                size="s"
                disabled={!state.unlockedDistricts.includes(selectedMarker.districtId)}
                onClick={() => {
                  navigator.push('/');
                  onCloseMap();
                }}
              >
                Перейти
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};
