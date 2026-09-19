export interface ButtonPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
}

export interface ButtonConfig {
  id: string;
  iconSrc: string | null;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bgColor: string;
  borderColor: string;
  textColor: string;
  disabled?: boolean;
}

const BUTTON_SIZE = 50;
const BUTTON_GAP = 8;

export const drawButtons = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  icons: {
    personaz: HTMLImageElement | null;
    arena: HTMLImageElement | null;
    boss: HTMLImageElement | null;
    cloth: HTMLImageElement | null;
    clans: HTMLImageElement | null;
    kazino: HTMLImageElement | null;
    gold: HTMLImageElement | null;
    komnata: HTMLImageElement | null;
    raion: HTMLImageElement | null;
  },
  carLevel: number,
  level: number,
  currentDistrict: string,
  districtName: string,
  lockedDistricts: { id: string; name: string; carLevel: number }[]
): ButtonPosition[] => {
  const buttonPositions: ButtonPosition[] = [];
  
  // Конфигурация кнопок (только те, у которых есть иконки)
  const buttons: ButtonConfig[] = [
    // Ряд 1: Профиль, Карта, Босс
    {
      id: 'profile',
      iconSrc: '/icon/personaz.jpg',
      label: 'Профиль',
      x: 10,
      y: canvasHeight - BUTTON_SIZE - 10,
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      bgColor: 'rgba(45, 21, 21, 0.9)',
      borderColor: '#ffd700',
      textColor: '#ffd700',
    },
    {
      id: 'map',
      iconSrc: '/icon/arena.jpg',
      label: 'Карта',
      x: 10 + BUTTON_SIZE + BUTTON_GAP,
      y: canvasHeight - BUTTON_SIZE - 10,
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      bgColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#ffd700',
      textColor: '#ffd700',
    },
    {
      id: 'boss',
      iconSrc: '/icon/boss.jpg',
      label: 'Босс',
      x: 10 + (BUTTON_SIZE + BUTTON_GAP) * 2,
      y: canvasHeight - BUTTON_SIZE - 10,
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      bgColor: 'rgba(26, 26, 46, 0.9)',
      borderColor: '#ff6666',
      textColor: '#ff6666',
    },
    // Ряд 2: Цех, Клан, Лотерея
    {
      id: 'workshop',
      iconSrc: '/icon/cloth.jpg',
      label: 'Цех',
      x: 10 + (BUTTON_SIZE + BUTTON_GAP) * 3,
      y: canvasHeight - BUTTON_SIZE - 10,
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      bgColor: 'rgba(26, 46, 26, 0.9)',
      borderColor: '#00ff88',
      textColor: '#00ff88',
    },
    {
      id: 'clan',
      iconSrc: '/icon/clans.jpg',
      label: 'Клан',
      x: 10 + (BUTTON_SIZE + BUTTON_GAP) * 4,
      y: canvasHeight - BUTTON_SIZE - 10,
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      bgColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#ff8800',
      textColor: '#ff8800',
    },
    {
      id: 'lottery',
      iconSrc: '/icon/kazino.jpg',
      label: 'Лотерея',
      x: 10,
      y: canvasHeight - BUTTON_SIZE * 2 - 10 - BUTTON_GAP,
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      bgColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#ffd700',
      textColor: '#ffd700',
    },
    // Ряд 3: Золото, Район
    {
      id: 'gold',
      iconSrc: '/icon/gold.png',
      label: 'Золото',
      x: 10 + BUTTON_SIZE + BUTTON_GAP,
      y: canvasHeight - BUTTON_SIZE * 2 - 10 - BUTTON_GAP,
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      bgColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#ffd700',
      textColor: '#ffd700',
    },
    {
      id: 'district',
      iconSrc: '/icon/raion.jpg',
      label: 'Район',
      x: 10 + (BUTTON_SIZE + BUTTON_GAP) * 2,
      y: canvasHeight - BUTTON_SIZE * 2 - 10 - BUTTON_GAP,
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      bgColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#00aaff',
      textColor: '#00aaff',
    },
    // Ряд 4: Локация
    {
      id: 'location',
      iconSrc: '/icon/komnata.jpg',
      label: 'Локация',
      x: 10 + (BUTTON_SIZE + BUTTON_GAP) * 3,
      y: canvasHeight - BUTTON_SIZE * 2 - 10 - BUTTON_GAP,
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      bgColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#00ff88',
      textColor: '#00ff88',
    },
  ];

  // Рисуем кнопки
  buttons.forEach((btn) => {
    // Фон кнопки
    ctx.fillStyle = btn.bgColor;
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 8);
    ctx.fill();
    
    // Рамка
    ctx.strokeStyle = btn.borderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 8);
    ctx.stroke();
    
    // Иконка
    const iconMap: Record<string, HTMLImageElement | null> = {
      personaz: icons.personaz,
      arena: icons.arena,
      boss: icons.boss,
      cloth: icons.cloth,
      clans: icons.clans,
      kazino: icons.kazino,
      gold: icons.gold,
      raion: icons.raion,
      komnata: icons.komnata,
    };
    
    const icon = iconMap[btn.id];
    if (icon instanceof HTMLImageElement && icon.complete && icon.naturalWidth > 0) {
      const iconSize = 24;
      ctx.drawImage(
        icon,
        btn.x + (btn.width - iconSize) / 2,
        btn.y + (btn.height - iconSize) / 2 - 6,
        iconSize,
        iconSize
      );
    } else {
      // Фолбэк - эмодзи
      ctx.fillStyle = btn.textColor;
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const emojiMap: Record<string, string> = {
        profile: '👤',
        map: '🗺️',
        boss: '⚔️',
        workshop: '🔧',
        clan: '👥',
        lottery: '🎰',
        gold: '💰',
        district: '🏘️',
        location: '🏠',
      };
      ctx.fillText(emojiMap[btn.id] || '❓', btn.x + btn.width / 2, btn.y + btn.height / 2 - 6);
    }
    
    // Подпись
    ctx.fillStyle = btn.textColor;
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height + 3);
    
    // Сохраняем позицию кнопки
    buttonPositions.push({
      x: btn.x,
      y: btn.y,
      width: btn.width,
      height: btn.height,
      id: btn.id,
    });
  });

  // Рисуем районы (если есть)
  if (lockedDistricts.length > 0) {
    const districtY = canvasHeight - BUTTON_SIZE * 3 - 10 - BUTTON_GAP * 2;
    const districtSpacing = (canvasWidth - 20) / Math.min(lockedDistricts.length, 5);
    
    lockedDistricts.slice(0, 5).forEach((district, index) => {
      const dx = 10 + index * districtSpacing;
      const isLocked = district.carLevel > carLevel;
      const isActive = currentDistrict === district.id;
      
      ctx.fillStyle = isActive ? 'rgba(255, 215, 0, 0.3)' : 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.roundRect(dx, districtY, districtSpacing - 4, BUTTON_SIZE, 6);
      ctx.fill();
      
      ctx.strokeStyle = isLocked ? '#666' : isActive ? '#ffd700' : '#00aaff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(dx, districtY, districtSpacing - 4, BUTTON_SIZE, 6);
      ctx.stroke();
      
      ctx.fillStyle = isLocked ? '#666' : '#fff';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(district.name, dx + (districtSpacing - 4) / 2, districtY + BUTTON_SIZE / 2);
      
      buttonPositions.push({
        x: dx,
        y: districtY,
        width: districtSpacing - 4,
        height: BUTTON_SIZE,
        id: `district_${district.id}`,
      });
    });
  }

  return buttonPositions;
};
