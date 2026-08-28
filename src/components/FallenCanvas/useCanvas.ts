import { useRef, useEffect, useState, useCallback } from 'react';
import { ButtonPosition, CANVAS_CONFIG, GameIcons, Task } from './types';
import { drawBackground } from './drawBackground';
import { drawCharacter, CHARACTER_POSITION } from './drawCharacter';
import { drawTasks } from './drawTasks';
import { drawResources } from './drawResources';
import { drawZombie } from './drawZombie';
import { TASKS } from './tasks';
import { isPointInRect, getButtonPositions } from './utils';
import { spawnParticles, updateParticles, drawParticles } from './particles';

export interface MapMarker {
  x: number;
  y: number;
  type: 'boss' | 'raid';
  name: string;
  districtId: string;
  locked: boolean;
}

// Получить маркеры на карте
const getMapMarkers = (width: number, height: number): MapMarker[] => [
  // Боссы
  { x: width * 0.50, y: height * 0.80, type: 'boss', name: 'Житель (Босс)', districtId: 'southgate', locked: false },
  { x: width * 0.30, y: height * 0.60, type: 'boss', name: 'Горожанин (Босс)', districtId: 'westend', locked: false },
  { x: width * 0.55, y: height * 0.45, type: 'boss', name: 'Злой Горожанин (Босс)', districtId: 'market', locked: false },
  { x: width * 0.25, y: height * 0.30, type: 'boss', name: 'Полицейский (Босс)', districtId: 'norted', locked: false },
  { x: width * 0.75, y: height * 0.20, type: 'boss', name: 'Мародёр (Босс)', districtId: 'industrial', locked: false },
  { x: width * 0.85, y: height * 0.65, type: 'boss', name: 'Контрабандист (Босс)', districtId: 'docks', locked: false },
  { x: width * 0.40, y: height * 0.15, type: 'boss', name: 'Проповедник (Босс)', districtId: 'cathedral', locked: false },
  { x: width * 0.15, y: height * 0.50, type: 'boss', name: 'Аристократ (Босс)', districtId: 'mansion', locked: false },
  { x: width * 0.60, y: height * 0.08, type: 'boss', name: 'Генерал (Босс)', districtId: 'military', locked: false },
  // Рейды
  { x: width * 0.20, y: height * 0.70, type: 'raid', name: 'Заброшенный дом', districtId: 'house', locked: false },
  { x: width * 0.70, y: height * 0.55, type: 'raid', name: 'Больница', districtId: 'hospital', locked: false },
  { x: width * 0.45, y: height * 0.75, type: 'raid', name: 'Склад', districtId: 'warehouse', locked: false },
  { x: width * 0.80, y: height * 0.35, type: 'raid', name: 'База Мародёров', districtId: 'marauder_base', locked: false },
  { x: width * 0.50, y: height * 0.50, type: 'raid', name: 'Военный пост', districtId: 'military_outpost', locked: false },
  { x: width * 0.35, y: height * 0.25, type: 'raid', name: 'Бункер правительства', districtId: 'government_bunker', locked: false },
];

// Функция отрисовки карты
const drawMap = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mapImage: HTMLImageElement | null
) => {
  // Фон
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  // Рисуем карту
  if (mapImage) {
    ctx.drawImage(mapImage, 0, 0, width, height);
  } else {
    // Заглушка если нет карты
    ctx.fillStyle = '#2d1515';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Карта Эргейта', width / 2, height / 2);
  }

  // Маркеры
  const markers = getMapMarkers(width, height);
  markers.forEach((marker) => {
    const color = marker.locked ? '#666' : marker.type === 'boss' ? '#ef4444' : '#22c55e';
    
    // Круг
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, 18, 0, Math.PI * 2);
    ctx.fill();
    
    // Обводка
    ctx.strokeStyle = marker.type === 'boss' ? '#ff6666' : '#4ade80';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Иконка
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(marker.type === 'boss' ? '💀' : '📦', marker.x, marker.y);
    
    // Название
    ctx.fillStyle = '#fff';
    ctx.font = '11px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(marker.name, marker.x, marker.y - 25);
  });

  // Кнопка закрыть
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.beginPath();
  ctx.roundRect(width - 80, 10, 70, 35, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✕ Закрыть', width - 45, 27);
};

export const useCanvas = (
  backgroundImage: HTMLImageElement | null,
  characterImage: HTMLImageElement | null,
  icons: GameIcons,
  energy: number,
  maxEnergy: number,
  authority: number,
  spicki: number,
  bullets: number,
  gold: number = 0,
  zhetons: number = 0,
  zombieHealth: number = 100,
  maxZombieHealth: number = 100,
  isZombieAlive: boolean = true,
  onResourceClick?: (id: string) => void,
  onTaskComplete?: (id: string) => void,
  onZombieClick?: () => void,
  tasks: Task[] = TASKS,
  appearanceColor = '#d4a574',
  showMap: boolean = false,
  mapImage: HTMLImageElement | null = null,
  onMapClick?: () => void,
  currentLocation?: string,
  onLocationChange?: (locationId: string) => void
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredX, setHoveredX] = useState(0);
  const [hoveredY, setHoveredY] = useState(0);
  const [buttonPositions, setButtonPositions] = useState<ButtonPosition[]>([]);
  const [needsRender, setNeedsRender] = useState(true);

  const lastDataRef = useRef({
    energy,
    maxEnergy,
    authority,
    spicki,
    bullets,
    gold,
    zhetons,
    zombieHealth,
    maxZombieHealth,
    isZombieAlive,
    hoveredX,
    hoveredY,
  });

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { WIDTH, HEIGHT } = CANVAS_CONFIG;
    
    if (canvas.width !== WIDTH || canvas.height !== HEIGHT) {
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
    }

    // Если показываем карту
    if (showMap) {
      drawMap(ctx, WIDTH, HEIGHT, mapImage);
      setNeedsRender(false);
      return;
    }

    // Обычный режим - рисуем фон, персонажа, зомби
    drawBackground(ctx, WIDTH, HEIGHT, backgroundImage);
    drawCharacter(ctx, CHARACTER_POSITION, characterImage, appearanceColor);
    drawZombie(
      ctx,
      600, 450,
      zombieHealth,
      maxZombieHealth,
      isZombieAlive,
      icons.zombie || null
    );

    drawTasks(ctx, tasks, WIDTH, HEIGHT, hoveredX, hoveredY);

    const positions = drawResources(
      ctx,
      WIDTH,
      energy,
      maxEnergy,
      icons,
      spicki,
      bullets,
      gold,
      zhetons
    );
    
    if (positions) {
      setButtonPositions(positions);
    }

    // Кнопка "Карта"
    const mapBtnX = WIDTH - 100;
    const mapBtnY = HEIGHT - 50;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(mapBtnX, mapBtnY, 90, 40, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🗺️ Карта', mapBtnX + 45, mapBtnY + 20);
    
    // Кнопка "Локация"
    const locBtnX = WIDTH - 210;
    const locBtnY = HEIGHT - 50;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(locBtnX, locBtnY, 100, 40, 8);
    ctx.fill();
    ctx.fillStyle = '#00ff88';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const locName = currentLocation ? currentLocation.replace('location', 'Локация ') : 'Локация';
    ctx.fillText('🏠 ' + locName, locBtnX + 50, locBtnY + 20);
    
    // Сохраняем позиции кнопок
    const mapBtnPos = { x: mapBtnX, y: mapBtnY, width: 90, height: 40, id: 'map' } as ButtonPosition;
    const locBtnPos = { x: locBtnX, y: locBtnY, width: 100, height: 40, id: 'location' } as ButtonPosition;
    setButtonPositions([...positions, mapBtnPos, locBtnPos]);

    // Particle system
    updateParticles();
    drawParticles(ctx);

    // Information overlay
    if (isZombieAlive) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(540, 400, 200, 30);
      ctx.fillStyle = "#ff4444";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`🧟 Зомби уровня ${Math.floor(zombieHealth / 30) + 1}`, 640, 420);
    } else {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(540, 400, 200, 30);
      ctx.fillStyle = "#ffd700";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.fillText("💀 Зомби повержен! Ожидание...", 640, 420);
    }

    setNeedsRender(false);
  }, [backgroundImage, characterImage, icons, zombieHealth, maxZombieHealth, isZombieAlive, tasks, appearanceColor, hoveredX, hoveredY, energy, maxEnergy, spicki, bullets, gold, zhetons, showMap, mapImage, currentLocation]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const data = { 
      energy, maxEnergy, authority, spicki, bullets, gold, zhetons,
      zombieHealth, maxZombieHealth, isZombieAlive,
      hoveredX, hoveredY 
    };
    const lastData = lastDataRef.current;
    
    const hasChanged = Object.keys(data).some(key => 
      data[key as keyof typeof data] !== lastData[key as keyof typeof data]
    );

    if (hasChanged && !needsRender) {
      lastDataRef.current = data;
      render();
    } else {
      lastDataRef.current = data;
    }
  }, [energy, maxEnergy, authority, spicki, bullets, gold, zhetons, 
      zombieHealth, maxZombieHealth, isZombieAlive,
      hoveredX, hoveredY, render, needsRender]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Если показываем карту - проверяем клики по маркерам
    if (showMap && onMapClick) {
      const markers = getMapMarkers(canvas.width, canvas.height);
      for (const marker of markers) {
        const dx = x - marker.x;
        const dy = y - marker.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 25) {
          // Клик по маркеру - можно добавить логику
          return;
        }
      }
      // Клик вне маркера - проверяем кнопку закрыть
      const closeBtnX = canvas.width - 80;
      const closeBtnY = 10;
      if (x > closeBtnX && x < closeBtnX + 70 && y > closeBtnY && y < closeBtnY + 35) {
        onMapClick();
        return;
      }
      // Клик вне маркера и кнопки - закрываем карту
      onMapClick();
      return;
    }

    // Показываем выбор локации
    if (onLocationChange && currentLocation) {
      const locBtnX = CANVAS_CONFIG.WIDTH - 210;
      const locBtnY = CANVAS_CONFIG.HEIGHT - 50;
      if (x > locBtnX && x < locBtnX + 100 && y > locBtnY && y < locBtnY + 40) {
        // Циклически переключаем локации
        const locNum = parseInt(currentLocation.replace('location', '')) || 1;
        const nextLoc = locNum >= 5 ? 'location1' : `location${locNum + 1}`;
        onLocationChange(nextLoc);
        setNeedsRender(true);
        return;
      }
    }

    // Проверяем клик по зомби (зона клика 600, 450, 80, 120)
    const zombieX = 600;
    const zombieY = 450;
    const zombieWidth = 80;
    const zombieHeight = 120;
    if (isZombieAlive && 
        x > zombieX && x < zombieX + zombieWidth && 
        y > zombieY && y < zombieY + zombieHeight) {
      if (onZombieClick) {
        onZombieClick();
        // Spawn blood/spark particles at zombie position
        spawnParticles(x, y, 12, '#ff4444', 'blood');
        spawnParticles(x, y, 8, '#888', 'smoke');
        setNeedsRender(true);
      }
      return;
    }

    // Проверяем клики по кнопкам ресурсов
    for (const btn of buttonPositions) {
      const isHover = x > btn.x && x < btn.x + btn.width && y > btn.y && y < btn.y + btn.height;
      if (isHover) {
        if (btn.id === 'map' && onMapClick) {
          onMapClick();
          setNeedsRender(true);
          return;
        }
        if (onResourceClick) {
          onResourceClick(btn.id);
          setNeedsRender(true);
        }
        return;
      }
    }

    // Проверяем клики по кнопкам заданий
    if (onTaskComplete) {
      const taskPositions = getButtonPositions(tasks, canvas.width, canvas.height);
      tasks.forEach((task, index) => {
        const pos = taskPositions[index];
        if (isPointInRect(x, y, pos)) {
          onTaskComplete(String(task.id));
          setNeedsRender(true);
        }
      });
    }
  }, [buttonPositions, isZombieAlive, onResourceClick, onTaskComplete, onZombieClick, tasks, showMap, onMapClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const newX = (e.clientX - rect.left) * scaleX;
    const newY = (e.clientY - rect.top) * scaleY;
    
    if (hoveredX !== newX || hoveredY !== newY) {
      setHoveredX(newX);
      setHoveredY(newY);
    }
  }, [hoveredX, hoveredY]);

  return {
    canvasRef,
    hoveredX,
    hoveredY,
    setHoveredX,
    setHoveredY,
    handleCanvasClick,
    handleMouseMove,
  };
};