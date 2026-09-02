// Отрисовка UI внутри Canvas

export interface ButtonPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
}

export interface UIFlags {
  showProfile?: boolean;
  showMap?: boolean;
  showBossModal?: boolean;
}

export interface GameData {
  energy: number;
  maxEnergy: number;
  spicki: number;
  bullets: number;
  gold: number;
  zhetons: number;
  level: number;
  carLevel: number;
  currentDistrict: string;
  districtName: string;
  currentLocation: string;
  authority: number;
}

export interface ProfileData {
  level: number;
  stamina: number;
  damage: number;
  luck: number;
  crit: number;
  gold: number;
  spicki: number;
  bullets: number;
  zhetons: number;
  appearance: number;
  carLevel: number;
  weapon: { name: string; level: number; broken: boolean };
}

export interface BossData {
  id: string;
  name: string;
  source: string;
  health: number;
  maxHealth: number;
  reward: {
    skulls: number;
    gold: number;
    weapons: number;
    weaponLevel: number;
  };
  requiredWeapons: { level: number; count: number }[];
  avatar: HTMLImageElement | null;
  lastWinner: string;
  wins: number;
  maxWins: number;
}

const drawIcon = (
  ctx: CanvasRenderingContext2D,
  icon: HTMLImageElement | null,
  x: number,
  y: number,
  size: number,
  fallback: string
) => {
  if (icon) {
    ctx.drawImage(icon, x, y, size, size);
  } else {
    ctx.font = `${size - 4}px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(fallback, x, y + 2);
  }
};

// ===== ЛЕВАЯ ПАНЕЛЬ (круглые кнопки с шипами) =====
const drawLeftPanel = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  startY: number,
  icons: Record<string, HTMLImageElement | null>,
  hoveredX: number,
  hoveredY: number,
  buttons: ButtonPosition[]
) => {
  const buttonSize = 60;
  const gap = 20;
  const startX = 10;
  const items = [
    { action: 'go_profile', iconKey: 'personaz', label: 'Профиль' },
    { action: 'go_quests', iconKey: 'clans', label: 'Задания' },
    { action: 'go_clan', iconKey: 'clans', label: 'Клан' },
  ];
  
  items.forEach((item, index) => {
    const btnY = startY + index * (buttonSize + gap);
    const btnX = startX;
    const centerX = btnX + buttonSize / 2;
    const centerY = btnY + buttonSize / 2;
    const radius = buttonSize / 2;
    
    const isHovered = hoveredX > btnX && hoveredX < btnX + buttonSize &&
                      hoveredY > btnY && hoveredY < btnY + buttonSize;
    
    // Шипы вокруг круга
    const spikeCount = 12;
    ctx.fillStyle = isHovered ? '#daa520' : '#8b6914';
    for (let i = 0; i < spikeCount; i++) {
      const angle = (i / spikeCount) * Math.PI * 2;
      const outerR = radius + 8;
      const innerR = radius - 2;
      const x1 = centerX + Math.cos(angle) * innerR;
      const y1 = centerY + Math.sin(angle) * innerR;
      const x2 = centerX + Math.cos(angle + Math.PI / spikeCount) * outerR;
      const y2 = centerY + Math.sin(angle + Math.PI / spikeCount) * outerR;
      const x3 = centerX + Math.cos(angle + 2 * Math.PI / spikeCount) * innerR;
      const y3 = centerY + Math.sin(angle + 2 * Math.PI / spikeCount) * innerR;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.fill();
    }
    
    // Фон круга
    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    bgGradient.addColorStop(0, isHovered ? 'rgba(60, 40, 20, 1)' : 'rgba(40, 25, 15, 1)');
    bgGradient.addColorStop(1, isHovered ? 'rgba(80, 50, 25, 1)' : 'rgba(50, 30, 15, 1)');
    ctx.fillStyle = bgGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Обводка
    ctx.strokeStyle = isHovered ? '#ffd700' : '#daa520';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Иконка из картинки
    const icon = icons[item.iconKey];
    if (icon && icon instanceof HTMLImageElement && icon.complete) {
      const iconSize = 36;
      ctx.drawImage(icon, centerX - iconSize / 2, centerY - iconSize / 2, iconSize, iconSize);
    } else {
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👤', centerX, centerY - 2);
    }
    
    // Подпись под кнопкой
    ctx.fillStyle = '#daa520';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(item.label, centerX, btnY + buttonSize + 12);
    
    buttons.push({ x: btnX, y: btnY, width: buttonSize, height: buttonSize, id: item.action });
  });
};

// ===== ПРАВАЯ ПАНЕЛЬ (круглые кнопки с шипами) =====
const drawRightPanel = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  startY: number,
  icons: Record<string, HTMLImageElement | null>,
  hoveredX: number,
  hoveredY: number,
  buttons: ButtonPosition[]
) => {
  const buttonSize = 65;
  const gap = 25;
  const startX = width - 10 - buttonSize;
  const items = [
    { action: 'go_battle', iconKey: 'arena', label: 'Арена' },
    { action: 'go_district', iconKey: 'raion', label: 'Районы' },
    { action: 'go_boss', iconKey: 'boss', label: 'Боссы' },
    { action: 'go_kazino', iconKey: 'kazino', label: 'Казино' },
    { action: 'go_cloth', iconKey: 'cloth', label: 'Одежда' },
    { action: 'go_komnata', iconKey: 'komnata', label: 'Комната' },
  ];
  
  items.forEach((item, index) => {
    const btnY = startY + index * (buttonSize + gap);
    const btnX = startX;
    const centerX = btnX + buttonSize / 2;
    const centerY = btnY + buttonSize / 2;
    const radius = buttonSize / 2;
    
    const isHovered = hoveredX > btnX && hoveredX < btnX + buttonSize &&
                      hoveredY > btnY && hoveredY < btnY + buttonSize;
    
    // Шипы вокруг круга
    const spikeCount = 12;
    ctx.fillStyle = isHovered ? '#daa520' : '#8b6914';
    for (let i = 0; i < spikeCount; i++) {
      const angle = (i / spikeCount) * Math.PI * 2;
      const outerR = radius + 8;
      const innerR = radius - 2;
      const x1 = centerX + Math.cos(angle) * innerR;
      const y1 = centerY + Math.sin(angle) * innerR;
      const x2 = centerX + Math.cos(angle + Math.PI / spikeCount) * outerR;
      const y2 = centerY + Math.sin(angle + Math.PI / spikeCount) * outerR;
      const x3 = centerX + Math.cos(angle + 2 * Math.PI / spikeCount) * innerR;
      const y3 = centerY + Math.sin(angle + 2 * Math.PI / spikeCount) * innerR;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.fill();
    }
    
    // Фон круга
    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    bgGradient.addColorStop(0, isHovered ? 'rgba(60, 40, 20, 1)' : 'rgba(40, 25, 15, 1)');
    bgGradient.addColorStop(1, isHovered ? 'rgba(80, 50, 25, 1)' : 'rgba(50, 30, 15, 1)');
    ctx.fillStyle = bgGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Обводка
    ctx.strokeStyle = isHovered ? '#ffd700' : '#daa520';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Иконка из картинки
    const icon = icons[item.iconKey];
    if (icon && icon instanceof HTMLImageElement && icon.complete) {
      const iconSize = 40;
      ctx.drawImage(icon, centerX - iconSize / 2, centerY - iconSize / 2, iconSize, iconSize);
    } else {
      ctx.font = '26px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚔️', centerX, centerY - 2);
    }
    
    // Подпись под кнопкой
    ctx.fillStyle = '#daa520';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(item.label, centerX, btnY + buttonSize + 14);
    
    buttons.push({ x: btnX, y: btnY, width: buttonSize, height: buttonSize, id: item.action });
  });
};

// ===== Нижние кнопки (3 кнопки внизу) =====
const drawBottomButtons = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  icons: Record<string, HTMLImageElement | null>,
  hoveredX: number,
  hoveredY: number,
  buttons: ButtonPosition[]
) => {
  const btnWidth = 120;
  const btnHeight = 35;
  const gap = 15;
  const totalWidth = btnWidth * 3 + gap * 2;
  const startX = (width - totalWidth) / 2;
  const startY = height - btnHeight - 10;
  
  const items = [
    { action: 'go_clan', iconKey: 'clans', label: 'Клан' },
    { action: 'friends', iconKey: 'personaz', label: 'Друзья' },
    { action: 'go_quests', iconKey: 'clans', label: 'Задания' },
  ];
  
  items.forEach((item, index) => {
    const btnX = startX + index * (btnWidth + gap);
    const btnY = startY;
    
    const isHovered = hoveredX > btnX && hoveredX < btnX + btnWidth &&
                      hoveredY > btnY && hoveredY < btnY + btnHeight;
    
    // Фон кнопки
    const bgGradient = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnHeight);
    bgGradient.addColorStop(0, isHovered ? 'rgba(139, 69, 0, 0.8)' : 'rgba(80, 40, 20, 0.8)');
    bgGradient.addColorStop(1, isHovered ? 'rgba(100, 50, 20, 0.9)' : 'rgba(60, 30, 15, 0.9)');
    ctx.fillStyle = bgGradient;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnWidth, btnHeight, 6);
    ctx.fill();
    
    // Обводка
    ctx.strokeStyle = isHovered ? '#ffd700' : '#8b6914';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnWidth, btnHeight, 6);
    ctx.stroke();
    
    // Свечение при наведении
    if (isHovered) {
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(btnX - 1, btnY - 1, btnWidth + 2, btnHeight + 2, 7);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    
    // Иконка из картинки
    const icon = icons[item.iconKey];
    if (icon && icon instanceof HTMLImageElement && icon.complete) {
      const iconSize = 20;
      ctx.drawImage(icon, btnX + btnWidth / 2 - iconSize / 2, btnY + btnHeight / 2 - iconSize / 2 - 3, iconSize, iconSize);
    } else {
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👥', btnX + btnWidth / 2, btnY + btnHeight / 2 - 5);
    }
    
    // Текст
    ctx.fillStyle = isHovered ? '#ffd700' : '#daa520';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(item.label, btnX + btnWidth / 2, btnY + btnHeight / 2 + 10);
    
    buttons.push({ x: btnX, y: btnY, width: btnWidth, height: btnHeight, id: item.action });
  });
};

// ===== Верхняя панель (профиль и ресурсы) =====
const drawTopBar = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  energy: number,
  maxEnergy: number,
  authority: number,
  spicki: number,
  bullets: number,
  gold: number,
  zhetons: number,
  level: number,
  carLevel: number,
  districtName: string,
  icons: Record<string, HTMLImageElement | null>,
  hoveredX: number,
  hoveredY: number,
  buttons: ButtonPosition[]
) => {
  const topBarHeight = 55;
  
  // Фон верхней панели - металлический градиент
  const bgGradient = ctx.createLinearGradient(0, 0, 0, topBarHeight);
  bgGradient.addColorStop(0, 'rgba(60, 55, 50, 0.95)');
  bgGradient.addColorStop(0.5, 'rgba(80, 75, 65, 0.95)');
  bgGradient.addColorStop(1, 'rgba(50, 45, 40, 0.95)');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, topBarHeight);
  
  // Декоративная рамка сверху и снизу
  ctx.strokeStyle = 'rgba(139, 69, 0, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, topBarHeight);
  ctx.lineTo(width, topBarHeight);
  ctx.stroke();
  
  // ===== ПРОФИЛЬ (левая часть) =====
  const profileSize = 45;
  const profileX = 10;
  const profileY = (topBarHeight - profileSize) / 2;
  const profileCenterX = profileX + profileSize / 2;
  const profileCenterY = profileY + profileSize / 2;
  const profileRadius = profileSize / 2;
  
  const isProfileHovered = hoveredX > profileX && hoveredX < profileX + profileSize &&
                           hoveredY > profileY && hoveredY < profileY + profileSize;
  
  // Шипы вокруг аватара
  const spikeCount = 10;
  ctx.fillStyle = isProfileHovered ? '#ffd700' : '#8b6914';
  for (let i = 0; i < spikeCount; i++) {
    const angle = (i / spikeCount) * Math.PI * 2;
    const outerR = profileRadius + 6;
    const innerR = profileRadius - 2;
    const x1 = profileCenterX + Math.cos(angle) * innerR;
    const y1 = profileCenterY + Math.sin(angle) * innerR;
    const x2 = profileCenterX + Math.cos(angle + Math.PI / spikeCount) * outerR;
    const y2 = profileCenterY + Math.sin(angle + Math.PI / spikeCount) * outerR;
    const x3 = profileCenterX + Math.cos(angle + 2 * Math.PI / spikeCount) * innerR;
    const y3 = profileCenterY + Math.sin(angle + 2 * Math.PI / spikeCount) * innerR;
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.fill();
  }
  
  // Фон аватара
  ctx.fillStyle = isProfileHovered ? 'rgba(80, 60, 40, 1)' : 'rgba(50, 35, 25, 1)';
  ctx.beginPath();
  ctx.arc(profileCenterX, profileCenterY, profileRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Обводка
  ctx.strokeStyle = isProfileHovered ? '#ffd700' : '#daa520';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(profileCenterX, profileCenterY, profileRadius, 0, Math.PI * 2);
  ctx.stroke();
  
  // Иконка профиля из картинки
  const profileIcon = icons.personaz;
  if (profileIcon && profileIcon instanceof HTMLImageElement && profileIcon.complete) {
    const iconSize = 30;
    ctx.drawImage(profileIcon, profileCenterX - iconSize / 2, profileCenterY - iconSize / 2, iconSize, iconSize);
  } else {
    ctx.font = '22px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👤', profileCenterX, profileCenterY);
  }
  
  // Имя и уровень
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Андрей Ануфриев', profileX + profileSize + 8, profileY + 15);
  ctx.fillStyle = '#aaa';
  ctx.font = '10px Arial';
  ctx.fillText('LVL 1', profileX + profileSize + 8, profileY + 30);
  
  // HP бар (мини)
  const hpBarX = profileX + profileSize + 8;
  const hpBarY = profileY + 35;
  const hpBarWidth = 120;
  const hpBarHeight = 6;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.roundRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight, 3);
  ctx.fill();
  ctx.fillStyle = '#ff4444';
  ctx.beginPath();
  ctx.roundRect(hpBarX, hpBarY, hpBarWidth * 0.7, hpBarHeight, 3);
  ctx.fill();
  
  buttons.push({ x: profileX, y: profileY, width: profileSize, height: profileSize, id: 'go_profile' });
  
  // ===== РЕСУРСЫ (правая часть) =====
  const resX = width - 20;
  let currentX = resX;
  
  // Золото
  currentX -= 55;
  const goldIcon = icons.gold;
  if (goldIcon && goldIcon instanceof HTMLImageElement && goldIcon.complete) {
    ctx.drawImage(goldIcon, currentX - 10, 28, 20, 20);
  } else {
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('💰', currentX, 38);
  }
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'right';
  ctx.fillText('24.8K', currentX, 18);
  
  // Черепы
  currentX -= 65;
  ctx.fillStyle = '#8b0000';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'right';
  ctx.fillText('405', currentX, 18);
  ctx.font = '14px Arial';
  ctx.fillText('💀', currentX, 38);
  
  // Энергия
  currentX -= 65;
  const energyIcon = icons.energy;
  if (energyIcon && energyIcon instanceof HTMLImageElement && energyIcon.complete) {
    ctx.drawImage(energyIcon, currentX - 10, 28, 20, 20);
  } else {
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('⚡', currentX, 38);
  }
  ctx.fillStyle = '#ffaa00';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'right';
  ctx.fillText('50', currentX, 18);
  
  // Жетоны
  currentX -= 65;
  const zhetonsIcon = icons.zhetons;
  if (zhetonsIcon && zhetonsIcon instanceof HTMLImageElement && zhetonsIcon.complete) {
    ctx.drawImage(zhetonsIcon, currentX - 10, 28, 20, 20);
  } else {
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('🎰', currentX, 38);
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'right';
  ctx.fillText('0', currentX, 18);
};

export const drawUI = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: GameData,
  profileData: ProfileData | null,
  flags: UIFlags,
  icons: Record<string, HTMLImageElement | null>,
  carouselOffset: number,
  hoveredX: number,
  hoveredY: number,
  bosses: BossData[] = []
): ButtonPosition[] => {
  const buttons: ButtonPosition[] = [];
  
  // ===== Верхняя панель =====
  drawTopBar(
    ctx,
    width,
    height,
    data.energy,
    data.maxEnergy,
    data.authority,
    data.spicki,
    data.bullets,
    data.gold,
    data.zhetons,
    data.level,
    data.carLevel,
    data.districtName,
    icons,
    hoveredX,
    hoveredY,
    buttons
  );
  
  if (flags.showProfile && profileData) {
    drawProfilePanel(ctx, width, height, profileData, icons);
    buttons.push(...getProfileButtons(width, height));
    return buttons;
  }
  
  if (flags.showMap) {
    drawMapPanel(ctx, width, height);
    return buttons;
  }
  
  if (flags.showBossModal) {
    drawBossModal(ctx, width, height, bosses, icons, hoveredX, hoveredY, buttons);
    buttons.push({ x: width - 70, y: 15, width: 60, height: 30, id: 'close_boss_modal' });
    buttons.push({ x: width / 2 - 60, y: height - 80, width: 120, height: 35, id: 'back_to_main' });
    return buttons;
  }
  
  // ===== Боковые панели =====
  drawLeftPanel(ctx, width, height, 70, icons, hoveredX, hoveredY, buttons);
  drawRightPanel(ctx, width, height, 70, icons, hoveredX, hoveredY, buttons);
  
  // ===== Нижние кнопки =====
  drawBottomButtons(ctx, width, height, icons, hoveredX, hoveredY, buttons);
  
  return buttons;
};
const drawProfilePanel = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: ProfileData,
  icons: Record<string, HTMLImageElement | null>
) => {
  const padding = 20;
  const panelWidth = width - padding * 2;
  const panelHeight = height - padding * 2;
  
  ctx.fillStyle = 'rgba(10, 10, 15, 0.95)';
  ctx.beginPath();
  ctx.roundRect(padding, padding, panelWidth, panelHeight, 12);
  ctx.fill();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(padding, padding, panelWidth, panelHeight, 12);
  ctx.stroke();
  
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👤 ПРОФИЛЬ', width / 2, padding + 25);
  
  const closeX = width - 70;
  const closeY = padding + 10;
  ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.roundRect(closeX, closeY, 60, 30, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('✕ Закрыть', closeX + 30, closeY + 15);
  
  const leftX = padding + 20;
  const rightX = width / 2 + 10;
  let y = padding + 60;
  
  // Персонаж - без фона, только текст
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Уровень ${data.level}`, leftX, y);
  y += 25;
  ctx.fillText(`Авто ур. ${data.carLevel}`, leftX, y);
  
  y = padding + 60;
  const stats = [
    { label: 'Выносливость', value: data.stamina, color: '#00ff88' },
    { label: 'Урон', value: data.damage, color: '#ff6666' },
    { label: 'Удача', value: data.luck, color: '#fbbf24' },
    { label: 'Крит', value: `${(data.crit * 100).toFixed(1)}%`, color: '#00aaff' },
  ];
  
  stats.forEach(stat => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(rightX, y, panelWidth / 2 - 40, 28, 6);
    ctx.fill();
    ctx.fillStyle = '#888';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(stat.label, rightX + 8, y + 14);
    ctx.fillStyle = stat.color;
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(stat.value.toString(), rightX + panelWidth / 2 - 48, y + 14);
    y += 35;
  });
};

const getProfileButtons = (width: number, height: number): ButtonPosition[] => {
  const padding = 20;
  const closeX = width - 70;
  const closeY = padding + 10;
  
  return [{
    x: closeX,
    y: closeY,
    width: 60,
    height: 30,
    id: 'close_profile'
  }];
};

const drawMapPanel = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🗺️ Карта Эргейта', width / 2, height / 2);
};

// Модальное окно боссов - на весь canvas с отдельным фоном
const drawBossModal = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bosses: BossData[],
  icons: Record<string, HTMLImageElement | null>,
  hX: number,
  hY: number,
  buttons: ButtonPosition[]
) => {
  // Отдельный фон на весь canvas
  ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
  ctx.fillRect(0, 0, width, height);
  
  // Текстура фона - виньетка
  const vignette = ctx.createRadialGradient(width/2, height/2, height*0.3, width/2, height/2, height*0.7);
  vignette.addColorStop(0, 'rgba(40, 20, 20, 0.3)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  
  // Заголовок
  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚔️ ВЫБОР БОССА', width / 2, 30);
  
  // Кнопка закрыть
  const closeX = width - 70;
  const closeY = 10;
  ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.roundRect(closeX, closeY, 60, 30, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('✕', closeX + 30, closeY + 16);
  buttons.push({ x: closeX, y: closeY, width: 60, height: 30, id: 'close_boss_modal' });
  
  // Рисуем карточки боссов
  const cardWidth = (width - 100) / 2;
  const cardHeight = 320;
  const cardGap = 20;
  
  bosses.forEach((boss, index) => {
    const cardX = 30 + (index % 2) * (cardWidth + cardGap);
    const cardY = 55 + Math.floor(index / 2) * (cardHeight + cardGap);
    
    const isHovered = hX > cardX && hX < cardX + cardWidth &&
                      hY > cardY && hY < cardY + cardHeight;
    
    // Фон карточки - тёмный с красной рамкой
    ctx.fillStyle = 'rgba(25, 15, 15, 0.95)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 10);
    ctx.fill();
    
    ctx.strokeStyle = isHovered ? '#ff6633' : '#8b0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 10);
    ctx.stroke();
    
    // Декоративные элементы - шипы по углам
    drawSpikes(ctx, cardX, cardY, cardWidth, cardHeight);
    
    // ===== ЛЕВАЯ КОЛОНКА: Босс =====
    const leftColX = cardX + 10;
    const leftColWidth = cardWidth * 0.35;
    let leftColY = cardY + 15;
    
    // Аватар босса
    const avatarSize = 80;
    const avatarX = leftColX + leftColWidth / 2;
    const avatarY = leftColY + 40;
    
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#8b0000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
    ctx.stroke();
    
    // Иконка босса
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const bossEmojis = ['💀', '👹', '🐉', '👊'];
    ctx.fillText(bossEmojis[index % bossEmojis.length], avatarX, avatarY);
    
    // Имя босса
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(boss.name, avatarX, avatarY + 55);
    
    // Рейтинг
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(leftColX, avatarY + 65, leftColWidth, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${boss.wins} / ${boss.maxWins}`, avatarX, avatarY + 76);
    
    // Кнопка "Купить"
    const buyX = leftColX;
    const buyY = cardY + cardHeight - 30;
    const buyWidth = leftColWidth;
    ctx.fillStyle = 'rgba(139, 69, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(buyX, buyY, buyWidth, 24, 4);
    ctx.fill();
    ctx.strokeStyle = '#daa520';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(buyX, buyY, buyWidth, 24, 4);
    ctx.stroke();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Купить', buyX + buyWidth / 2, buyY + 13);
    buttons.push({ x: buyX, y: buyY, width: buyWidth, height: 24, id: `buy_boss_${boss.id}` });
    
    // ===== ЦЕНТРАЛЬНАЯ КОЛОНКА: Награда =====
    const centerColX = cardX + leftColWidth + 15;
    const centerColWidth = cardWidth * 0.35;
    let centerColY = cardY + 15;
    
    // Заголовок "НАГРАДА"
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('НАГРАДА', centerColX + centerColWidth / 2, centerColY + 12);
    
    // Награда: черепа
    centerColY += 25;
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8b0000';
    ctx.fillText('💀', centerColX, centerColY);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(boss.reward.skulls.toString(), centerColX + 20, centerColY);
    
    // Награда: золото
    centerColY += 20;
    ctx.fillStyle = '#ffd700';
    ctx.font = '14px Arial';
    ctx.fillText('💰', centerColX, centerColY);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(boss.reward.gold.toString(), centerColX + 20, centerColY);
    
    // Награда: сундук
    centerColY += 20;
    ctx.fillStyle = '#888';
    ctx.font = '14px Arial';
    ctx.fillText('📦', centerColX, centerColY);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('[0/4]', centerColX + 20, centerColY);
    
    // Награда: оружие
    centerColY += 20;
    ctx.fillStyle = '#888';
    ctx.font = '14px Arial';
    ctx.fillText('🔫', centerColX, centerColY);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('[0/4]', centerColX + 20, centerColY);
    
    // Разделитель
    centerColY += 20;
    ctx.strokeStyle = 'rgba(139, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerColX, centerColY);
    ctx.lineTo(centerColX + centerColWidth, centerColY);
    ctx.stroke();
    
    // Заголовок "ТРЕБУЕТСЯ"
    centerColY += 15;
    ctx.fillStyle = '#ff6633';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ТРЕБУЕТСЯ', centerColX + centerColWidth / 2, centerColY);
    
    // Требования
    centerColY += 20;
    ctx.fillStyle = '#888';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`⚔️ Ур. ${boss.reward.weaponLevel}`, centerColX, centerColY);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(`[${boss.requiredWeapons[0]?.count || 1}]`, centerColX + 60, centerColY);
    
    // Кнопка "Атаковать"
    centerColY += 25;
    const attackX = centerColX;
    const attackY = centerColY;
    const attackWidth = centerColWidth;
    
    const attackGradient = ctx.createLinearGradient(attackX, attackY, attackX, attackY + 28);
    attackGradient.addColorStop(0, 'rgba(180, 0, 0, 0.8)');
    attackGradient.addColorStop(1, 'rgba(100, 0, 0, 0.8)');
    ctx.fillStyle = attackGradient;
    ctx.beginPath();
    ctx.roundRect(attackX, attackY, attackWidth, 28, 6);
    ctx.fill();
    
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(attackX, attackY, attackWidth, 28, 6);
    ctx.stroke();
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Атаковать', attackX + attackWidth / 2, attackY + 15);
    
    buttons.push({ x: attackX, y: attackY, width: attackWidth, height: 28, id: `attack_boss_${boss.id}` });
    
    // Кнопка "Соло"
    const soloY = attackY + 33;
    ctx.fillStyle = 'rgba(50, 50, 80, 0.6)';
    ctx.beginPath();
    ctx.roundRect(attackX, soloY, attackWidth, 24, 6);
    ctx.fill();
    ctx.strokeStyle = '#6666aa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(attackX, soloY, attackWidth, 24, 6);
    ctx.stroke();
    ctx.fillStyle = '#aaaaff';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('Соло', attackX + attackWidth / 2, soloY + 13);
    buttons.push({ x: attackX, y: soloY, width: attackWidth, height: 24, id: `solo_boss_${boss.id}` });
    
    // ===== ПРАВАЯ КОЛОНКА: Последний победитель =====
    const rightColX = centerColX + centerColWidth + 15;
    const rightColWidth = cardWidth - rightColX - cardX;
    let rightColY = cardY + 15;
    
    // Заголовок "ПОСЛЕДНИЙ ПОБЕДИТЕЛЬ"
    ctx.fillStyle = '#00aaff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ПОСЛЕДНИЙ ПОБЕДИТЕЛЬ', rightColX + rightColWidth / 2, rightColY + 12);
    
    // Аватар победителя
    rightColY += 25;
    const winnerAvatarX = rightColX + rightColWidth / 2;
    const winnerAvatarY = rightColY + 25;
    const winnerAvatarSize = 50;
    
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(winnerAvatarX, winnerAvatarY, winnerAvatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(winnerAvatarX, winnerAvatarY, winnerAvatarSize / 2, 0, Math.PI * 2);
    ctx.stroke();
    
    // Иконка победителя
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('😊', winnerAvatarX, winnerAvatarY);
    
    // Имя победителя
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(boss.lastWinner, winnerAvatarX, winnerAvatarY + 40);
    
    // Разделитель
    rightColY += 75;
    ctx.strokeStyle = 'rgba(0, 170, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rightColX, rightColY);
    ctx.lineTo(rightColX + rightColWidth, rightColY);
    ctx.stroke();
    
    // Заголовок "КОЛИЧЕСТВО ПОБЕД"
    rightColY += 15;
    ctx.fillStyle = '#00aaff';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('КОЛИЧЕСТВО ПОБЕД', rightColX + rightColWidth / 2, rightColY);
    
    // Счётчик побед
    rightColY += 20;
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`${boss.wins} / ${boss.maxWins}`, rightColX + rightColWidth / 2, rightColY);
  });
};

// Функция для рисования шипов по углам
const drawSpikes = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  ctx.fillStyle = '#8b0000';
  
  // Верхний левый
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 8, y - 8);
  ctx.lineTo(x, y - 8);
  ctx.fill();
  
  // Верхний правый
  ctx.beginPath();
  ctx.moveTo(x + width, y);
  ctx.lineTo(x + width + 8, y - 8);
  ctx.lineTo(x + width, y - 8);
  ctx.fill();
  
  // Нижний левый
  ctx.beginPath();
  ctx.moveTo(x, y + height);
  ctx.lineTo(x - 8, y + height + 8);
  ctx.lineTo(x, y + height + 8);
  ctx.fill();
  
  // Нижний правый
  ctx.beginPath();
  ctx.moveTo(x + width, y + height);
  ctx.lineTo(x + width + 8, y + height + 8);
  ctx.lineTo(x + width, y + height + 8);
  ctx.fill();
};

