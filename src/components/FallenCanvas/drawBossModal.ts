import type { BossData, ButtonPosition } from './canvasTypes';
import { fitFont, getInitials, getRoomName } from './bossCanvasUtils';

export const BOSS_VISIBLE = 2;

// Фоновая картинка, залитая по центру прямоугольника (cover) со скруглением
const drawCoverRound = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) => {
  if (!img || !img.complete || img.naturalWidth <= 0) return;
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = w / h;
  let dw = w;
  let dh = h;
  if (imgRatio > boxRatio) dw = h * imgRatio;
  else dh = w / imgRatio;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
};

// Панель колонки карточки босса: подложка + фоновая картинка + затемнение для читаемости
const drawColumnBg = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  stroke: string
) => {
  ctx.fillStyle = 'rgba(15, 12, 12, 0.85)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();

  drawCoverRound(ctx, img, x, y, w, h, 8);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();

  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.stroke();
};

// Круглый аватар: картинка либо инициалы
const drawCircleAvatar = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  img: HTMLImageElement | null,
  initials: string,
  stroke: string,
  textSize: number
) => {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#1b1515';
  ctx.fill();
  ctx.clip();

  if (img && img.complete && img.naturalWidth > 0) {
    const ratio = img.naturalWidth / img.naturalHeight;
    let dw = r * 2;
    let dh = r * 2;
    if (ratio > 1) dh = (r * 2) / ratio;
    else dw = r * 2 * ratio;
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  } else {
    ctx.fillStyle = '#8a8a8a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(textSize)}px Arial`;
    ctx.fillText(initials || '?', cx, cy + 1);
  }
  ctx.restore();

  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
};

// Строка вида "подпись ........ значение"
const drawStatRow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  label: string,
  value: string,
  labelColor: string,
  valueColor: string,
  fontSize: number
) => {
  ctx.textBaseline = 'middle';
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'left';
  ctx.fillStyle = labelColor;
  ctx.fillText(label, x, y);

  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'right';
  ctx.fillStyle = valueColor;
  ctx.fillText(value, x + w, y);
};

const drawBossCard = (
  ctx: CanvasRenderingContext2D,
  cardX: number,
  cardY: number,
  cardWidth: number,
  cardHeight: number,
  boss: BossData,
  icons: Record<string, HTMLImageElement | null>,
  hX: number,
  hY: number,
  buttons: ButtonPosition[]
) => {
  const isHovered = hX > cardX && hX < cardX + cardWidth &&
                    hY > cardY && hY < cardY + cardHeight;

  // Фон карточки
  ctx.fillStyle = 'rgba(20, 15, 15, 0.95)';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 12);
  ctx.fill();

  ctx.strokeStyle = isHovered ? '#ff4444' : '#8b0000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 12);
  ctx.stroke();

  drawBossSpikes(ctx, cardX, cardY, cardWidth, cardHeight);

  // Масштаб содержимого относительно базовой высоты карточки (300)
  const k = Math.max(0.72, Math.min(1.15, cardHeight / 300));
  const pad = Math.round(10 * k);
  const colGap = Math.round(12 * k);

  const innerWidth = cardWidth - pad * 2;
  const leftColWidth = Math.min(160, Math.round(innerWidth * 0.22));
  const rightColWidth = Math.min(240, Math.round(innerWidth * 0.28));
  const centerColWidth = innerWidth - leftColWidth - rightColWidth - colGap * 2;

  const leftColX = cardX + pad;
  const centerColX = leftColX + leftColWidth + colGap;
  const rightColX = centerColX + centerColWidth + colGap;

  const colTop = cardY + pad;
  const colHeight = cardHeight - pad * 2;

  // ===== ЛЕВАЯ КОЛОНКА: аватар, имя, рейтинг, кнопка "Купить" =====
  drawColumnBg(ctx, icons.fonIconBoss || null, leftColX, colTop, leftColWidth, colHeight, '#8b0000');

  const avatarR = Math.min(48 * k, leftColWidth / 2 - 8, colHeight * 0.2);
  const avatarCX = leftColX + leftColWidth / 2;
  const avatarCY = colTop + avatarR + Math.round(12 * k);
  drawCircleAvatar(ctx, avatarCX, avatarCY, avatarR, null, getInitials(boss.name), boss.color, 22 * k);

  // Имя босса
  ctx.fillStyle = '#ff4444';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, boss.name, leftColWidth - 12, Math.round(15 * k));
  ctx.fillText(boss.name, avatarCX, avatarCY + avatarR + Math.round(16 * k));

  // Уровень босса
  const ratingH = Math.round(22 * k);
  const ratingY = colTop + colHeight - ratingH - Math.round(38 * k);
  const ratingW = leftColWidth - Math.round(16 * k);
  const ratingX = leftColX + Math.round(8 * k);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.roundRect(ratingX, ratingY, ratingW, ratingH, 4);
  ctx.fill();
  ctx.fillStyle = '#ffd700';
  ctx.font = `bold ${Math.round(12 * k)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(`LVL ${boss.level}`, ratingX + ratingW / 2, ratingY + ratingH / 2);

  // Кнопка "Купить"
  const buyH = Math.round(24 * k);
  const buyY = colTop + colHeight - buyH - Math.round(8 * k);
  const buyHovered = hX > ratingX && hX < ratingX + ratingW && hY > buyY && hY < buyY + buyH;
  ctx.fillStyle = buyHovered ? 'rgba(150, 95, 10, 0.9)' : 'rgba(100, 60, 0, 0.75)';
  ctx.beginPath();
  ctx.roundRect(ratingX, buyY, ratingW, buyH, 4);
  ctx.fill();
  ctx.strokeStyle = '#daa520';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(ratingX, buyY, ratingW, buyH, 4);
  ctx.stroke();
  ctx.fillStyle = '#ffd700';
  ctx.font = `bold ${Math.round(12 * k)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('Купить', ratingX + ratingW / 2, buyY + buyH / 2);
  buttons.push({ x: ratingX, y: buyY, width: ratingW, height: buyH, id: `buy_boss_${boss.id}` });

  // ===== Кнопка "В бой" =====
  {
    const fightH = Math.round(26 * k);
    const fightY = ratingY - fightH - Math.round(8 * k);
    const fightHovered = hX > ratingX && hX < ratingX + ratingW && hY > fightY && hY < fightY + fightH;

    ctx.fillStyle = fightHovered ? 'rgba(160, 30, 30, 0.95)' : 'rgba(110, 20, 20, 0.85)';
    ctx.beginPath();
    ctx.roundRect(ratingX, fightY, ratingW, fightH, 4);
    ctx.fill();
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(ratingX, fightY, ratingW, fightH, 4);
    ctx.stroke();
    ctx.fillStyle = '#ffdddd';
    ctx.font = `bold ${Math.round(13 * k)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('В БОЙ', ratingX + ratingW / 2, fightY + fightH / 2);
    buttons.push({ x: ratingX, y: fightY, width: ratingW, height: fightH, id: `boss_fight_${boss.id}` });
  }



  // ===== ЦЕНТРАЛЬНАЯ КОЛОНКА: награда и требования =====
  drawColumnBg(ctx, icons.fonLoot || null, centerColX, colTop, centerColWidth, colHeight, '#8b6914');

  const colPad = Math.round(10 * k);
  const rowW = centerColWidth - colPad * 2;
  const rowX = centerColX + colPad;
  let cy = colTop + Math.round(14 * k);

  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(14 * k)}px Arial`;
  ctx.fillText('НАГРАДА', centerColX + centerColWidth / 2, cy);
  cy += Math.round(16 * k);

  ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rowX, cy);
  ctx.lineTo(rowX + rowW, cy);
  ctx.stroke();
  cy += Math.round(14 * k);

  const rewardFont = Math.round(12 * k);
  const rowStep = Math.round(19 * k);
  drawStatRow(ctx, rowX, cy, rowW, 'Золото (атака)', `${boss.attackReward.gold}`, '#cccccc', '#ffd700', rewardFont);
  cy += rowStep;
  drawStatRow(ctx, rowX, cy, rowW, 'Патроны (атака)', `${boss.attackReward.bullets}`, '#cccccc', '#ffffff', rewardFont);
  cy += rowStep;
  drawStatRow(ctx, rowX, cy, rowW, 'Зоны (атака)', `${boss.attackReward.zones}`, '#cccccc', '#ffffff', rewardFont);
  cy += rowStep;
  drawStatRow(ctx, rowX, cy, rowW, 'Золото (соло)', `${boss.soloReward.gold}`, '#cccccc', '#ffd700', rewardFont);
  cy += rowStep;
  drawStatRow(ctx, rowX, cy, rowW, 'Патроны (соло)', `${boss.soloReward.bullets}`, '#cccccc', '#ffffff', rewardFont);
  cy += rowStep;
  drawStatRow(ctx, rowX, cy, rowW, 'Жетоны (соло)', `${boss.soloReward.tokens}`, '#cccccc', '#ffffff', rewardFont);
  cy += rowStep;
  if (boss.roomReward) {
    drawStatRow(ctx, rowX, cy, rowW, 'Комната', getRoomName(boss.roomReward), '#cccccc', '#77dd77', rewardFont);
    cy += rowStep;
  }

  cy += Math.round(6 * k);
  ctx.strokeStyle = 'rgba(139, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.moveTo(rowX, cy);
  ctx.lineTo(rowX + rowW, cy);
  ctx.stroke();
  cy += Math.round(14 * k);

  ctx.fillStyle = '#ff6633';
  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(12 * k)}px Arial`;
  ctx.fillText('ТРЕБУЕТСЯ', centerColX + centerColWidth / 2, cy);
  cy += Math.round(18 * k);

  fitFont(ctx, boss.requirements, rowW, Math.round(11 * k));
  ctx.fillStyle = '#dddddd';
  ctx.textAlign = 'center';
  ctx.fillText(boss.requirements, centerColX + centerColWidth / 2, cy);
  cy += Math.round(17 * k);

  // Кнопки "Атаковать" и "Соло" прижаты к низу колонки
  const soloH = Math.round(26 * k);
  const attackH = Math.round(30 * k);
  const soloY = colTop + colHeight - soloH - Math.round(8 * k);
  const attackY = soloY - soloH * 0 - Math.round(6 * k) - attackH;

  const attackGradient = ctx.createLinearGradient(centerColX, attackY, centerColX, attackY + attackH);
  attackGradient.addColorStop(0, 'rgba(180, 0, 0, 0.9)');
  attackGradient.addColorStop(1, 'rgba(100, 0, 0, 0.9)');
  ctx.fillStyle = attackGradient;
  ctx.beginPath();
  ctx.roundRect(centerColX + colPad, attackY, rowW, attackH, 6);
  ctx.fill();
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(centerColX + colPad, attackY, rowW, attackH, 6);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(14 * k)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('Атаковать', centerColX + centerColWidth / 2, attackY + attackH / 2);
  buttons.push({ x: centerColX + colPad, y: attackY, width: rowW, height: attackH, id: `attack_boss_${boss.id}` });

  ctx.fillStyle = 'rgba(50, 50, 80, 0.7)';
  ctx.beginPath();
  ctx.roundRect(centerColX + colPad, soloY, rowW, soloH, 6);
  ctx.fill();
  ctx.strokeStyle = '#6666aa';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(centerColX + colPad, soloY, rowW, soloH, 6);
  ctx.stroke();
  ctx.fillStyle = '#aaaaff';
  ctx.font = `bold ${Math.round(12 * k)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('Соло', centerColX + centerColWidth / 2, soloY + soloH / 2);
  buttons.push({ x: centerColX + colPad, y: soloY, width: rowW, height: soloH, id: `solo_boss_${boss.id}` });

  // ===== ПРАВАЯ КОЛОНКА: последний победитель =====
  drawColumnBg(ctx, icons.fonWinnera || null, rightColX, colTop, rightColWidth, colHeight, '#00aaff');

  const rPad = Math.round(10 * k);
  const rRowX = rightColX + rPad;
  const rRowW = rightColWidth - rPad * 2;
  let ry = colTop + Math.round(14 * k);

  ctx.fillStyle = '#00aaff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, 'ОПИСАНИЕ', rRowW, Math.round(13 * k));
  ctx.fillText('ОПИСАНИЕ', rightColX + rightColWidth / 2, ry);
  ry += Math.round(16 * k);

  ctx.strokeStyle = 'rgba(0, 170, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rRowX, ry);
  ctx.lineTo(rRowX + rRowW, ry);
  ctx.stroke();
  ry += Math.round(16 * k);

  ctx.fillStyle = '#ffd27a';
  fitFont(ctx, boss.subtitle, rRowW, Math.round(12 * k));
  ctx.fillText(boss.subtitle, rightColX + rightColWidth / 2, ry);
  ry += Math.round(22 * k);

  // Описание босса — перенос по словам
  const descFont = Math.round(11 * k);
  const descLineH = descFont + 5;
  ctx.font = `${descFont}px Arial`;
  ctx.fillStyle = '#dddddd';
  ctx.textAlign = 'center';

  let descLine = '';
  boss.description.split(' ').forEach((word) => {
    const candidate = descLine ? `${descLine} ${word}` : word;
    if (ctx.measureText(candidate).width > rRowW && descLine) {
      ctx.fillText(descLine, rightColX + rightColWidth / 2, ry);
      ry += descLineH;
      descLine = word;
    } else {
      descLine = candidate;
    }
  });
  if (descLine) {
    ctx.fillText(descLine, rightColX + rightColWidth / 2, ry);
    ry += descLineH;
  }

  // Отметка "особый" босс
  if (boss.isSpecial) {
    ry += Math.round(12 * k);
    const badgeW = Math.min(rRowW, Math.round(96 * k));
    const badgeH = Math.round(20 * k);
    const badgeX = rightColX + (rightColWidth - badgeW) / 2;
    ctx.fillStyle = 'rgba(255, 215, 0, 0.18)';
    ctx.beginPath();
    ctx.roundRect(badgeX, ry, badgeW, badgeH, 4);
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(badgeX, ry, badgeW, badgeH, 4);
    ctx.stroke();
    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${Math.round(11 * k)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('ОСОБЫЙ', rightColX + rightColWidth / 2, ry + badgeH / 2);
  }
};

// ===== Окно боя с боссом (модальное, поверх всего интерфейса) =====
// Картинки босса и персонажа анимируются по абсолютным таймингам из BossFight:
// покачивание в простое, выпад персонажа при ударе, тряска и вспышка у цели.
export const drawBossModal = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bosses: BossData[],
  icons: Record<string, HTMLImageElement | null>,
  hX: number,
  hY: number,
  buttons: ButtonPosition[],
  scrollOffset: number = 0
) => {
  // Отдельный фон на весь canvas с текстурой
  ctx.fillStyle = 'rgba(5, 5, 10, 0.97)';
  ctx.fillRect(0, 0, width, height);

  // Текстура фона - сетка
  ctx.strokeStyle = 'rgba(139, 0, 0, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  for (let i = 0; i < height; i += 50) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  // Заголовок (ниже верхней панели, высота которой 55)
  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('БОССЫ', width / 2, 72);

  // Кнопка назад (слева, ниже верхней панели)
  const backX = 20;
  const backY = 62;
  ctx.fillStyle = hX > backX && hX < backX + 80 && hY > backY && hY < backY + 30 ? 'rgba(255, 100, 100, 0.8)' : 'rgba(200, 50, 50, 0.6)';
  ctx.beginPath();
  ctx.roundRect(backX, backY, 80, 30, 6);
  ctx.fill();
  ctx.strokeStyle = '#ff6666';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(backX, backY, 80, 30, 6);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Назад', backX + 40, backY + 16);
  buttons.push({ x: backX, y: backY, width: 80, height: 30, id: 'back_to_main' });

  // Кнопка закрыть (справа, ниже верхней панели)
  const closeX = width - 60;
  const closeY = 62;
  ctx.fillStyle = 'rgba(139, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.roundRect(closeX, closeY, 50, 30, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('X', closeX + 25, closeY + 16);
  buttons.push({ x: closeX, y: closeY, width: 50, height: 30, id: 'close_boss_modal' });

  // Список боссов: на экране BOSS_VISIBLE карточек, прокрутка по 2
  const listTop = 100;
  const listBottom = height - 12;
  const listGap = 14;
  const maxOffset = Math.max(0, bosses.length - BOSS_VISIBLE);
  const offset = Math.min(maxOffset, Math.max(0, Math.floor(scrollOffset)));
  const cardWidth = width - 40;
  const cardX = 20;
  const cardHeight = (listBottom - listTop - listGap * (BOSS_VISIBLE - 1)) / BOSS_VISIBLE;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, listTop, width, listBottom - listTop);
  ctx.clip();

  for (let i = 0; i < BOSS_VISIBLE; i++) {
    const index = offset + i;
    const boss = bosses[index];
    if (!boss) continue;
    const cardY = listTop + i * (cardHeight + listGap);
    drawBossCard(ctx, cardX, cardY, cardWidth, cardHeight, boss, icons, hX, hY, buttons);
  }

  ctx.restore();

  // Индикатор прокрутки
  if (maxOffset > 0) {
    const from = offset + 1;
    const to = Math.min(bosses.length, offset + BOSS_VISIBLE);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${from}-${to} из ${bosses.length}  ·  колесо мыши`, width / 2, listBottom - 2);
  }
};

// Функция для рисования шипов по углам карточки босса
const drawBossSpikes = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  ctx.fillStyle = '#8b0000';

  // Верхние шипы
  for (let i = 0; i < width; i += 30) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + 8, y - 6);
    ctx.lineTo(x + i + 16, y);
    ctx.fill();
  }

  // Нижние шипы
  for (let i = 0; i < width; i += 30) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + height);
    ctx.lineTo(x + i + 8, y + height + 6);
    ctx.lineTo(x + i + 16, y + height);
    ctx.fill();
  }

  // Левые шипы
  for (let i = 0; i < height; i += 30) {
    ctx.beginPath();
    ctx.moveTo(x, y + i);
    ctx.lineTo(x - 6, y + i + 8);
    ctx.lineTo(x, y + i + 16);
    ctx.fill();
  }

  // Правые шипы
  for (let i = 0; i < height; i += 30) {
    ctx.beginPath();
    ctx.moveTo(x + width, y + i);
    ctx.lineTo(x + width + 6, y + i + 8);
    ctx.lineTo(x + width, y + i + 16);
    ctx.fill();
  }
};
