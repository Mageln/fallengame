// src/components/FallenCanvas/drawProfile.ts

import { GameIcons } from '../../hooks/useIcon';

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

export const drawProfile = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  icons: GameIcons,
  characterImage: HTMLImageElement | null,
  appearanceColor: string,
  profileData: ProfileData,
  isHovered: boolean,
  hoveredX: number,
  hoveredY: number
): ButtonPosition[] => {
  const buttonPositions: ButtonPosition[] = [];
  const padding = 15;
  const panelWidth = canvasWidth - padding * 2;
  const panelHeight = canvasHeight - padding * 2;
  const panelX = padding;
  const panelY = padding;

  // Фон панели
  ctx.fillStyle = 'rgba(10, 10, 15, 0.95)';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 12);
  ctx.fill();

  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 12);
  ctx.stroke();

  // Заголовок
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👤 ПРОФИЛЬ ПЕРСОНАЖА', canvasWidth / 2, panelY + 30);

  // Кнопка закрыть
  const closeBtnX = canvasWidth - 60;
  const closeBtnY = panelY + 10;
  const closeBtnW = 50;
  const closeBtnH = 30;

  ctx.fillStyle = isHovered && hoveredX > closeBtnX && hoveredX < closeBtnX + closeBtnW && hoveredY > closeBtnY && hoveredY < closeBtnY + closeBtnH ? '#ff4444' : 'rgba(255, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.roundRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH, 6);
  ctx.fill();
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH, 6);
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✕ Закрыть', closeBtnX + closeBtnW / 2, closeBtnY + closeBtnH / 2);

  buttonPositions.push({
    x: closeBtnX,
    y: closeBtnY,
    width: closeBtnW,
    height: closeBtnH,
    id: 'close_profile',
  });

  // Левая колонка - Персонаж
  const leftColX = panelX + 20;
  const leftColWidth = panelWidth * 0.45;
  const charCenterX = leftColX + leftColWidth / 2;
  const charCenterY = panelY + 120;

  // Рисуем персонажа
  if (characterImage instanceof HTMLImageElement && characterImage.complete && characterImage.naturalWidth > 0) {
    const charWidth = 120;
    const charHeight = 180;
    ctx.drawImage(characterImage, charCenterX - charWidth / 2, charCenterY - charHeight / 2, charWidth, charHeight);
  } else {
    // Заглушка - силуэт
    ctx.fillStyle = appearanceColor;
    ctx.beginPath();
    ctx.arc(charCenterX, charCenterY - 40, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(charCenterX - 20, charCenterY - 15, 40, 70);
  }

  // Имя и уровень
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Уровень ${profileData.level}`, charCenterX, charCenterY + 100);

  ctx.fillStyle = '#888';
  ctx.font = '12px Arial';
  ctx.fillText(`Авто ур. ${profileData.carLevel}`, charCenterX, charCenterY + 118);

  // Правая колонка - Статы
  const rightColX = panelX + panelWidth * 0.5;
  const rightColWidth = panelWidth * 0.45 - 30;
  let statY = panelY + 60;

  const stats: Array<{ label: string; value: string | number; color: string; icon: string }> = [
    { label: 'Выносливость', value: profileData.stamina, color: '#00ff88', icon: '⚡' },
    { label: 'Урон', value: profileData.damage, color: '#ff6666', icon: '⚔' },
    { label: 'Удача', value: profileData.luck, color: '#fbbf24', icon: '🍀' },
    { label: 'Крит. шанс', value: `${(profileData.crit * 100).toFixed(1)}%`, color: '#00aaff', icon: '🎯' },
  ];

  stats.forEach((stat) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(rightColX, statY, rightColWidth, 30, 6);
    ctx.fill();

    ctx.fillStyle = '#888';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${stat.icon} ${stat.label}`, rightColX + 8, statY + 15);

    ctx.fillStyle = stat.color;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(stat.value.toString(), rightColX + rightColWidth - 8, statY + 15);

    statY += 38;
  });

  statY += 10;

  // Оружие
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  ctx.roundRect(rightColX, statY, rightColWidth, 40, 6);
  ctx.fill();

  ctx.fillStyle = profileData.weapon.broken ? '#ff4444' : '#fff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`🔫 ${profileData.weapon.broken ? 'Оружие сломано!' : profileData.weapon.name}`, rightColX + 8, statY + 15);

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`+${profileData.weapon.level}`, rightColX + rightColWidth - 8, statY + 15);

  statY += 50;

  // Ресурсы
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('💰 Ресурсы', rightColX, statY);
  statY += 8;

  const resources: Array<{ label: string; value: number; color: string }> = [
    { label: 'Золото', value: profileData.gold, color: '#ffd700' },
    { label: 'Пули', value: profileData.bullets, color: '#aaa' },
    { label: 'Спички', value: profileData.spicki, color: '#ff8800' },
    { label: 'Жетоны', value: profileData.zhetons, color: '#00aaff' },
  ];

  const resPerRow = 2;
  const resSpacing = rightColWidth / resPerRow;

  resources.forEach((res, index) => {
    const row = Math.floor(index / resPerRow);
    const col = index % resPerRow;
    const resX = rightColX + col * resSpacing;
    const resY = statY + row * 28;

    ctx.fillStyle = res.color;
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${res.label}: ${res.value}`, resX + resSpacing / 2, resY);
  });

  // Кнопки быстрой навигации
  const navBtnY = panelY + panelHeight - 50;
  const navBtnWidth = (panelWidth - 40) / 3;
  const navButtons = [
    { id: 'nav_workshop', label: '🔧 Цех', x: panelX + 20, color: '#00ff88' },
    { id: 'nav_battle', label: '⚔️ Босс', x: panelX + 20 + navBtnWidth + 10, color: '#ff6666' },
    { id: 'nav_clan', label: '👥 Клан', x: panelX + 20 + (navBtnWidth + 10) * 2, color: '#ff8800' },
  ];

  navButtons.forEach((btn) => {
    const isHover = isHovered &&
      hoveredX > btn.x && hoveredX < btn.x + navBtnWidth &&
      hoveredY > navBtnY && hoveredY < navBtnY + 40;

    ctx.fillStyle = isHover ? `${btn.color}33` : 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(btn.x, navBtnY, navBtnWidth, 40, 8);
    ctx.fill();

    ctx.strokeStyle = btn.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(btn.x, navBtnY, navBtnWidth, 40, 8);
    ctx.stroke();

    ctx.fillStyle = btn.color;
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, btn.x + navBtnWidth / 2, navBtnY + 20);

    buttonPositions.push({
      x: btn.x,
      y: navBtnY,
      width: navBtnWidth,
      height: 40,
      id: btn.id,
    });
  });

  return buttonPositions;
};
