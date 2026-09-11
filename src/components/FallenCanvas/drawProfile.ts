// src/components/FallenCanvas/drawProfile.ts

interface ProfileData {
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

export interface ButtonPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
}

// Вспомогательные функции для рисования
const drawGlowText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  color: string,
  glowColor: string,
  align: 'left' | 'center' | 'right' = 'center'
) => {
  ctx.save();
  ctx.font = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  
  // Свечение
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 8;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  
  // Основной текст
  ctx.shadowBlur = 0;
  ctx.fillText(text, x, y);
  ctx.restore();
};

const drawProgressBar = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  progress: number,
  bgColor: string,
  fillColor: string,
  borderColor: string
) => {
  // Фон полоски
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 4);
  ctx.fill();
  
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 4);
  ctx.stroke();
  
  // Заполнение
  if (progress > 0) {
    const fillWidth = Math.max(0, (width - 2) * progress);
    const gradient = ctx.createLinearGradient(x, y, x + fillWidth, y);
    gradient.addColorStop(0, fillColor);
    gradient.addColorStop(1, lightenColor(fillColor, 30));
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, fillWidth, height - 2, 3);
    ctx.fill();
    
    // Блик
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, fillWidth, (height - 2) / 2, [3, 3, 0, 0]);
    ctx.fill();
  }
};

const lightenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + percent);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + percent);
  const b = Math.min(255, (num & 0x0000FF) + percent);
  return `rgb(${r}, ${g}, ${b})`;
};

const drawStatCard = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  icon: string,
  label: string,
  value: string | number,
  valueColor: string,
  progress?: { current: number; max: number }
) => {
  // Карточка с фоном
  ctx.fillStyle = 'rgba(20, 25, 40, 0.8)';
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();
  
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.stroke();
  
  // Иконка
  ctx.font = '20px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(icon, x + 10, y + 8);
  
  // Метка
  ctx.fillStyle = '#8899aa';
  ctx.font = '11px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(label, x + 38, y + 12);
  
  // Значение
  drawGlowText(ctx, value.toString(), x + width - 10, y + 14, 13, valueColor, valueColor, 'right');
  
  // Полоска прогресса (если есть)
  if (progress && progress.max > 0) {
    const progressY = y + height - 12;
    const progressWidth = width - 20;
    const progressVal = Math.min(1, Math.max(0, progress.current / progress.max));
    
    drawProgressBar(
      ctx,
      x + 10,
      progressY,
      progressWidth,
      6,
      progressVal,
      'rgba(0, 0, 0, 0.4)',
      valueColor,
      'rgba(255, 255, 255, 0.1)'
    );
  }
};

export const drawProfile = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  icons: Record<string, HTMLImageElement | null>,
  characterImage: HTMLImageElement | null,
  appearanceColor: string,
  profileData: ProfileData,
  isHovered: boolean,
  hoveredX: number,
  hoveredY: number
): ButtonPosition[] => {
  const buttonPositions: ButtonPosition[] = [];
  const padding = 15;
  const topBarHeight = 55; // верхняя панель всегда видна поверх профиля
  const panelWidth = canvasWidth - padding * 2;
  const panelHeight = canvasHeight - padding - topBarHeight + padding;
  const panelX = padding;
  const panelY = topBarHeight + padding - 15; // панель начинается сразу под верхней панелью

  // ===== ФОН ПАНЕЛИ =====
  // Градиентный фон
  const bgGradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
  bgGradient.addColorStop(0, 'rgba(15, 18, 30, 0.97)');
  bgGradient.addColorStop(0.5, 'rgba(10, 14, 25, 0.97)');
  bgGradient.addColorStop(1, 'rgba(8, 10, 20, 0.97)');
  ctx.fillStyle = bgGradient;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 16);
  ctx.fill();

  // Золотая рамка с градиентом
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 16);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ===== ЗАГОЛОВОК =====
  ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
  ctx.beginPath();
  ctx.roundRect(panelX + 10, panelY + 5, panelWidth - 20, 45, 10);
  ctx.fill();

  drawGlowText(ctx, '👤 ПРОФИЛЬ ПЕРСОНАЖА', canvasWidth / 2, panelY + 28, 18, '#ffd700', '#ffd700');

  // ===== КНОПКА ЗАКРЫТЬ =====
  const closeBtnX = panelX + 10;
  const closeBtnY = panelY + 8;
  const closeBtnW = 70;
  const closeBtnH = 32;
  const isCloseHovered = isHovered &&
    hoveredX > closeBtnX && hoveredX < closeBtnX + closeBtnW &&
    hoveredY > closeBtnY && hoveredY < closeBtnY + closeBtnH;

  ctx.fillStyle = isCloseHovered ? 'rgba(255, 100, 100, 0.8)' : 'rgba(200, 50, 50, 0.6)';
  ctx.beginPath();
  ctx.roundRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH, 8);
  ctx.fill();

  ctx.strokeStyle = '#ff6666';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH, 8);
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('← Назад', closeBtnX + closeBtnW / 2, closeBtnY + closeBtnH / 2);

  buttonPositions.push({
    x: closeBtnX,
    y: closeBtnY,
    width: closeBtnW,
    height: closeBtnH,
    id: 'close_profile',
  });

  // ===== ЛЕВАЯ КОЛОНКА — ПЕРСОНАЖ =====
  const leftColX = panelX + 15;
  const leftColWidth = panelWidth * 0.42;
  const charCenterX = leftColX + leftColWidth / 2;
  const charTopY = panelY + 70;

  // Рамка персонажа
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(leftColX, charTopY, leftColWidth, 220, 12);
  ctx.stroke();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.roundRect(leftColX, charTopY, leftColWidth, 220, 12);
  ctx.fill();

  // Персонаж
  if (characterImage instanceof HTMLImageElement && characterImage.complete && characterImage.naturalWidth > 0) {
    const charWidth = 100;
    const charHeight = 160;
    ctx.drawImage(
      characterImage,
      charCenterX - charWidth / 2,
      charTopY + 20,
      charWidth,
      charHeight
    );
  } else {
    // Стилизованный силуэт
    const headY = charTopY + 45;
    const bodyY = charTopY + 75;
    
    // Голова
    ctx.fillStyle = appearanceColor;
    ctx.beginPath();
    ctx.arc(charCenterX, headY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Тело
    ctx.fillStyle = appearanceColor;
    ctx.beginPath();
    ctx.roundRect(charCenterX - 18, bodyY, 36, 65, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Руки
    ctx.beginPath();
    ctx.roundRect(charCenterX - 30, bodyY + 5, 12, 45, 4);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(charCenterX + 18, bodyY + 5, 12, 45, 4);
    ctx.fill();
    ctx.stroke();
    
    // Ноги
    ctx.beginPath();
    ctx.roundRect(charCenterX - 16, bodyY + 65, 12, 45, 4);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(charCenterX + 4, bodyY + 65, 12, 45, 4);
    ctx.fill();
    ctx.stroke();
  }

  // Уровень персонажа
  const levelBadgeY = charTopY + 200;
  ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
  ctx.beginPath();
  ctx.roundRect(charCenterX - 50, levelBadgeY, 100, 28, 14);
  ctx.fill();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(charCenterX - 50, levelBadgeY, 100, 28, 14);
  ctx.stroke();

  drawGlowText(ctx, `Ур. ${profileData.level}`, charCenterX, levelBadgeY + 14, 12, '#ffd700', '#ffd700');

  // ===== ПРАВАЯ КОЛОНКА — СТАТЫ =====
  const rightColX = panelX + panelWidth * 0.46;
  const rightColWidth = panelWidth * 0.5 - 35;
  
  // Размер карточки статов
  const cardWidth = rightColWidth;
  const cardHeight = 48;
  const cardGap = 8;
  let currentY = panelY + 65;

  // Карточка выносливости
  drawStatCard(
    ctx,
    rightColX,
    currentY,
    cardWidth,
    cardHeight,
    '⚡',
    'Выносливость',
    profileData.stamina,
    '#00ff88',
    { current: profileData.stamina, max: profileData.stamina }
  );
  currentY += cardHeight + cardGap;

  // Карточка урона
  drawStatCard(
    ctx,
    rightColX,
    currentY,
    cardWidth,
    cardHeight,
    '⚔️',
    'Боевой урон',
    profileData.damage,
    '#ff6666',
    { current: profileData.damage, max: profileData.damage }
  );
  currentY += cardHeight + cardGap;

  // Карточка удачи
  drawStatCard(
    ctx,
    rightColX,
    currentY,
    cardWidth,
    cardHeight,
    '🍀',
    'Удача',
    profileData.luck,
    '#fbbf24',
    { current: profileData.luck, max: profileData.luck }
  );
  currentY += cardHeight + cardGap;

  // Карточка крит. шанс
  drawStatCard(
    ctx,
    rightColX,
    currentY,
    cardWidth,
    cardHeight,
    '🎯',
    'Крит. шанс',
    `${(profileData.crit * 100).toFixed(1)}%`,
    '#00aaff',
    { current: profileData.crit * 100, max: 100 }
  );
  currentY += cardHeight + cardGap + 10;

  // ===== ОРУЖИЕ =====
  const weaponY = currentY;
  const weaponHeight = 60;
  
  ctx.fillStyle = profileData.weapon.broken ? 'rgba(255, 68, 68, 0.1)' : 'rgba(255, 215, 0, 0.08)';
  ctx.beginPath();
  ctx.roundRect(rightColX, weaponY, cardWidth, weaponHeight, 10);
  ctx.fill();
  
  ctx.strokeStyle = profileData.weapon.broken ? 'rgba(255, 68, 68, 0.5)' : 'rgba(255, 215, 0, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(rightColX, weaponY, cardWidth, weaponHeight, 10);
  ctx.stroke();

  // Иконка оружия
  ctx.font = '24px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(profileData.weapon.broken ? '💥' : '🔫', rightColX + 10, weaponY + 8);

  // Название оружия
  ctx.fillStyle = profileData.weapon.broken ? '#ff6666' : '#ffffff';
  ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(
    profileData.weapon.broken ? 'Оружие сломано!' : profileData.weapon.name,
    rightColX + 42,
    weaponY + 10
  );

  // Уровень оружия
  drawGlowText(ctx, `+${profileData.weapon.level}`, rightColX + cardWidth - 10, weaponY + 14, 12, '#ffd700', '#ffd700', 'right');

  // Прогресс прочности оружия (заглушка)
  drawProgressBar(
    ctx,
    rightColX + 10,
    weaponY + 36,
    cardWidth - 20,
    5,
    0.7,
    'rgba(0, 0, 0, 0.4)',
    profileData.weapon.broken ? '#ff4444' : '#ffd700',
    'rgba(255, 255, 255, 0.1)'
  );

  currentY += weaponHeight + 15;

  // ===== РЕСУРСЫ =====
  drawGlowText(ctx, '💰 Ресурсы', rightColX, currentY, 14, '#ffd700', '#ffd700', 'left');
  currentY += 22;

  const resources: Array<{ label: string; value: number; color: string; icon: string }> = [
    { label: 'Золото', value: profileData.gold, color: '#ffd700', icon: '🪙' },
    { label: 'Пули', value: profileData.bullets, color: '#cccccc', icon: '🔫' },
    { label: 'Спички', value: profileData.spicki, color: '#ff8800', icon: '🔥' },
    { label: 'Жетоны', value: profileData.zhetons, color: '#00aaff', icon: '🎫' },
  ];

  const resCardWidth = (cardWidth - cardGap) / 2;
  const resCardHeight = 42;

  resources.forEach((res, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const resX = rightColX + col * (resCardWidth + cardGap);
    const resY = currentY + row * (resCardHeight + cardGap);

    drawStatCard(
      ctx,
      resX,
      resY,
      resCardWidth,
      resCardHeight,
      res.icon,
      res.label,
      res.value.toLocaleString(),
      res.color
    );
  });

  // ===== КНОПКИ НАВИГАЦИИ =====
  const navBtnY = panelY + panelHeight - 55;
  const navBtnWidth = (panelWidth - 50) / 3;
  const navButtons = [
    { id: 'nav_workshop', label: '🔧 Цех', color: '#00ff88', hoverColor: '#00cc66' },
    { id: 'nav_battle', label: '⚔️ Босс', color: '#ff6666', hoverColor: '#cc4444' },
    { id: 'nav_clan', label: '👥 Клан', color: '#ff8800', hoverColor: '#cc6600' },
  ];

  navButtons.forEach((btn, index) => {
    const btnX = panelX + 20 + index * (navBtnWidth + 10);
    const isHover = isHovered &&
      hoveredX > btnX && hoveredX < btnX + navBtnWidth &&
      hoveredY > navBtnY && hoveredY < navBtnY + 45;
    
    const btnGradient = ctx.createLinearGradient(btnX, navBtnY, btnX, navBtnY + 45);
    btnGradient.addColorStop(0, isHover ? btn.hoverColor : `${btn.color}99`);
    btnGradient.addColorStop(1, isHover ? btn.color : `${btn.color}66`);
    
    ctx.fillStyle = btnGradient;
    ctx.beginPath();
    ctx.roundRect(btnX, navBtnY, navBtnWidth, 45, 10);
    ctx.fill();

    ctx.strokeStyle = btn.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(btnX, navBtnY, navBtnWidth, 45, 10);
    ctx.stroke();

    drawGlowText(ctx, btn.label, btnX + navBtnWidth / 2, navBtnY + 22, 13, btn.color, btn.color);

    buttonPositions.push({
      x: btnX,
      y: navBtnY,
      width: navBtnWidth,
      height: 45,
      id: btn.id,
    });
  });

  return buttonPositions;
};
