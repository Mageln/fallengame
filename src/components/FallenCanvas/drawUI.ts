// Отрисовка UI внутри Canvas

import type { ButtonPosition, UIFlags, MapRaid, GameData, ProfileData, BossData, HoverAnim } from './canvasTypes';
export type { ButtonPosition, UIFlags, MapRaid, GameData, ProfileData, BossData, BossFight, HoverAnim } from './canvasTypes';
import { drawProfile } from './drawProfile';
import { getVisibleBounds } from './iconBounds';
import { drawShelterDoor } from './shelter';
import { drawMapRaids } from './drawMapRaids';
import { drawBossFight } from './drawBossFight';
import { drawBossModal } from './drawBossModal';
import { battleToFight, fightAnim, trackFightHit } from './fightAnimation';
export { BOSS_VISIBLE } from './drawBossModal';
export { getRoomName } from './bossCanvasUtils';

// ===== ЛЕВАЯ ПАНЕЛЬ (круглые кнопки с шипами) =====


// ===== ПРАВАЯ ПАНЕЛЬ (карусель иконок: видно по 3, стрелки вверх/вниз) =====
const RIGHT_PANEL_ITEMS = [
  { action: 'go_battle', iconKey: 'arena', label: 'Арена' },
  { action: 'go_district', iconKey: 'raion', label: 'Районы' },
  { action: 'go_boss', iconKey: 'boss', label: 'Боссы' },
  { action: 'go_kazino', iconKey: 'kazino', label: 'Казино' },
  { action: 'go_cloth', iconKey: 'cloth', label: 'Магазин' },
  { action: 'go_komnata', iconKey: 'komnata', label: 'Комната' },
];

const RIGHT_PANEL_VISIBLE = 3;
export const RIGHT_PANEL_MAX_OFFSET = Math.max(0, RIGHT_PANEL_ITEMS.length - RIGHT_PANEL_VISIBLE);

export const EMPTY_HOVER_ANIM: HoverAnim = { id: null, scale: 1, shakeX: 0, shakeY: 0, rot: 0 };

// Стрелка карусели (вверх/вниз)
const drawCarouselArrow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  direction: 'up' | 'down',
  enabled: boolean,
  hovered: boolean
) => {
  ctx.save();

  ctx.fillStyle = enabled
    ? (hovered ? 'rgba(139, 69, 0, 0.9)' : 'rgba(50, 45, 40, 0.85)')
    : 'rgba(40, 40, 40, 0.5)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();

  ctx.strokeStyle = enabled ? (hovered ? '#ffd700' : '#8b6914') : 'rgba(120, 120, 120, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.stroke();

  const cx = x + w / 2;
  const cy = y + h / 2;
  const s = Math.min(w, h) * 0.28;
  ctx.beginPath();
  if (direction === 'up') {
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx - s, cy + s * 0.7);
    ctx.lineTo(cx + s, cy + s * 0.7);
  } else {
    ctx.moveTo(cx, cy + s);
    ctx.lineTo(cx - s, cy - s * 0.7);
    ctx.lineTo(cx + s, cy - s * 0.7);
  }
  ctx.closePath();
  ctx.fillStyle = enabled ? (hovered ? '#ffd700' : '#daa520') : 'rgba(150, 150, 150, 0.5)';
  ctx.fill();

  ctx.restore();
};

const drawRightPanel = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  icons: Record<string, HTMLImageElement | null>,
  hoveredX: number,
  hoveredY: number,
  buttons: ButtonPosition[],
  carouselOffset: number = 0,
  hoverAnim: HoverAnim = EMPTY_HOVER_ANIM,
  lockedRoomsRemain: boolean = false
) => {
  const buttonSize = 88;
  const gap = 22;
  const rightPadding = 20;
  const arrowWidth = 56;
  const arrowHeight = 30;
  const arrowGap = 10;
  const topBarHeight = 55;
  const bottomReserved = 86; // учитывает увеличенную нижнюю панель иконок

  const offset = Math.min(Math.max(0, Math.floor(carouselOffset)), RIGHT_PANEL_MAX_OFFSET);

  const areaTop = topBarHeight + 10;
  const areaBottom = height - bottomReserved;

  // Если по высоте не влезает — пропорционально уменьшаем слоты
  const maxListHeight = areaBottom - areaTop - (arrowHeight + arrowGap) * 2;
  const needListHeight = RIGHT_PANEL_VISIBLE * buttonSize + (RIGHT_PANEL_VISIBLE - 1) * gap;
  const scale = needListHeight > maxListHeight ? Math.max(0.6, maxListHeight / needListHeight) : 1;
  const slotSize = buttonSize * scale;
  const slotGap = gap * scale;

  const startX = width - rightPadding - slotSize;
  const centerX = startX + slotSize / 2;

  // Каркас панели: стрелка + 3 слота + стрелка, вертикально по центру
  const listHeight = RIGHT_PANEL_VISIBLE * slotSize + (RIGHT_PANEL_VISIBLE - 1) * slotGap;
  const panelHeight = arrowHeight + arrowGap + listHeight + arrowGap + arrowHeight;

  const panelTop = Math.max(areaTop, areaTop + (areaBottom - areaTop - panelHeight) / 2);

  const upArrow = { x: centerX - arrowWidth / 2, y: panelTop, width: arrowWidth, height: arrowHeight };
  const listTop = panelTop + arrowHeight + arrowGap;
  const downArrow = {
    x: centerX - arrowWidth / 2,
    y: listTop + listHeight + arrowGap,
    width: arrowWidth,
    height: arrowHeight,
  };

  type Slot = { item: typeof RIGHT_PANEL_ITEMS[number]; cx: number; cy: number; y: number };

  // Видимые иконки
  const slots: Slot[] = [];
  for (let i = 0; i < RIGHT_PANEL_VISIBLE; i++) {
    const item = RIGHT_PANEL_ITEMS[offset + i];
    if (!item) continue;
    const y = listTop + i * (slotSize + slotGap);
    slots.push({ item, cx: centerX, cy: y + slotSize / 2, y });
  }

  const iconSize = slotSize * 0.78;

  // Регистрируем зоны клика по всему слоту (без учёта анимации)
  slots.forEach(({ item, y }) => {
    buttons.push({ x: startX, y, width: slotSize, height: slotSize, id: item.action });
  });

  // Рисуем сначала неактивные, затем наведённую — чтобы она была поверх соседей
  const drawSlot = (slot: Slot, animated: boolean) => {
    const { item, cx, cy } = slot;
    const isHovered = hoveredX > startX && hoveredX < startX + slotSize &&
                      hoveredY > slot.y && hoveredY < slot.y + slotSize;
    const active = animated || isHovered;

    const scale = active ? hoverAnim.scale : 1;
    const dx = active ? hoverAnim.shakeX : 0;
    const dy = active ? hoverAnim.shakeY : 0;
    const rot = active ? hoverAnim.rot : 0;

    ctx.save();
    ctx.translate(cx + dx, cy + dy);
    if (rot) ctx.rotate(rot);
    ctx.scale(scale, scale);

    if (active) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, slotSize / 2 - 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Иконка убежища загружается так же, как остальные кнопки.
    const icon = icons[item.iconKey];
    if (icon && icon instanceof HTMLImageElement && icon.complete && icon.naturalWidth > 0) {
      ctx.drawImage(icon, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
      if (item.action === 'go_komnata' && lockedRoomsRemain) {
        const badgeR = iconSize * 0.16;
        const bx = iconSize / 2 - badgeR;
        const by = -iconSize / 2 + badgeR;
        ctx.fillStyle = '#a52d26';
        ctx.beginPath();
        ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.font = `bold ${Math.round(iconSize * 0.16)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔒', bx, by + 1);
      }
    } else if (item.action === 'go_komnata') {
      drawShelterDoor(ctx, iconSize, active, lockedRoomsRemain);
    } else {
      ctx.font = `${Math.round(slotSize * 0.5)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚔️', 0, -2);
    }

    ctx.restore();
  };

  slots.filter(s => s.item.action !== hoverAnim.id).forEach(s => drawSlot(s, false));
  const hoveredSlot = slots.find(s => s.item.action === hoverAnim.id);
  if (hoveredSlot) drawSlot(hoveredSlot, true);

  // Стрелки карусели
  const isUpHovered = hoveredX > upArrow.x && hoveredX < upArrow.x + upArrow.width &&
                      hoveredY > upArrow.y && hoveredY < upArrow.y + upArrow.height;
  const isDownHovered = hoveredX > downArrow.x && hoveredX < downArrow.x + downArrow.width &&
                        hoveredY > downArrow.y && hoveredY < downArrow.y + downArrow.height;

  drawCarouselArrow(ctx, upArrow.x, upArrow.y, arrowWidth, arrowHeight, 'up', offset > 0, isUpHovered);
  drawCarouselArrow(ctx, downArrow.x, downArrow.y, arrowWidth, arrowHeight, 'down', offset < RIGHT_PANEL_MAX_OFFSET, isDownHovered);

  buttons.push({ ...upArrow, id: 'carousel_up' });
  buttons.push({ ...downArrow, id: 'carousel_down' });
};

// ===== Нижние кнопки (иконки без фона и без обводки, анимация как у правой панели) =====
const drawBottomButtons = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  icons: Record<string, HTMLImageElement | null>,
  hoveredX: number,
  hoveredY: number,
  buttons: ButtonPosition[],
  hoverAnim: HoverAnim = EMPTY_HOVER_ANIM
) => {
  const slotW = 118;
  const slotH = 74;
  const gap = 18;
  const bottomPadding = 6;
  const sidePadding = 24;

  const items = [
    { action: 'go_clan', iconKey: 'clan', fallbackKey: 'clans', fallbackIcon: '🛡️' },
    { action: 'friends', iconKey: 'friends', fallbackKey: 'personaz', fallbackIcon: '👥' },
    { action: 'go_quests', iconKey: 'quest', fallbackKey: 'clans', fallbackIcon: '📜' },
  ];

  // Если по ширине не влезает — пропорционально уменьшаем слоты
  const needWidth = slotW * items.length + gap * (items.length - 1);
  const scaleW = needWidth > width - sidePadding * 2 ? Math.max(0.6, (width - sidePadding * 2) / needWidth) : 1;
  const boxW = slotW * scaleW;
  const boxH = slotH * scaleW;
  const boxGap = gap * scaleW;

  const totalWidth = boxW * items.length + boxGap * (items.length - 1);
  const startX = (width - totalWidth) / 2;
  const startY = height - boxH - bottomPadding;

  // Поля внутри слота, в которые вписывается иконка с сохранением пропорций
  const innerW = boxW - 12;
  const innerH = boxH - 10;

  type Slot = { item: typeof items[number]; cx: number; cy: number; x: number; y: number };

  const slots: Slot[] = items.map((item, index) => {
    const x = startX + index * (boxW + boxGap);
    const y = startY;
    // Зона клика по всему слоту (без учёта анимации)
    buttons.push({ x, y, width: boxW, height: boxH, id: item.action });
    return { item, cx: x + boxW / 2, cy: y + boxH / 2, x, y };
  });

  // Сначала неактивные, затем наведённая — чтобы она была поверх соседей
  const drawSlot = (slot: Slot, animated: boolean) => {
    const { item, cx, cy, x, y } = slot;
    const isHovered = hoveredX > x && hoveredX < x + boxW &&
                      hoveredY > y && hoveredY < y + boxH;
    const active = animated || isHovered;

    const scale = active ? hoverAnim.scale : 1;
    const dx = active ? hoverAnim.shakeX : 0;
    const dy = active ? hoverAnim.shakeY : 0;
    const rot = active ? hoverAnim.rot : 0;

    ctx.save();
    ctx.translate(cx + dx, cy + dy);
    if (rot) ctx.rotate(rot);
    ctx.scale(scale, scale);

    // Подложка при наведении (без обводки)
    if (active) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 10);
      ctx.fill();
    }

    // Иконка вписывается в слот с сохранением пропорций.
    // Нормируем по площади видимой части: картинки приходят с разными пропорциями
    // и прозрачными полями, из-за чего раньше «Клан» выглядел крупнее «Друзей» и «Заданий».
    const icon = icons[item.iconKey] || icons[item.fallbackKey];
    if (icon && icon instanceof HTMLImageElement && icon.complete && icon.naturalWidth > 0) {
      const bounds = getVisibleBounds(icon);
      const vw = bounds.w;
      const vh = bounds.h;

      // Одинаковая визуальная масса: целевая площадь ~ половина слота
      const targetArea = innerW * innerH * 0.5;
      const fitScale = Math.sqrt(targetArea / (vw * vh));
      let drawW = vw * fitScale;
      let drawH = vh * fitScale;

      // Не выходим за границы слота
      if (drawW > innerW) {
        drawW = innerW;
        drawH = (innerW * vh) / vw;
      }
      if (drawH > innerH) {
        drawH = innerH;
        drawW = (innerH * vw) / vh;
      }

      // Рисуем только видимую часть картинки (без прозрачных полей)
      ctx.drawImage(icon, bounds.x, bounds.y, vw, vh, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.font = `${Math.round(boxH * 0.55)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.fallbackIcon, 0, -2);
    }

    ctx.restore();
  };

  slots.filter(s => s.item.action !== hoverAnim.id).forEach(s => drawSlot(s, false));
  const hoveredSlot = slots.find(s => s.item.action === hoverAnim.id);
  if (hoveredSlot) drawSlot(hoveredSlot, true);
};

// ===== Верхняя панель (профиль и ресурсы) =====
const drawTopBar = (
  ctx: CanvasRenderingContext2D,
  width: number,
  energy: number,
  maxEnergy: number,
  spicki: number,
  bullets: number,
  gold: number,
  premiumGold: number,
  zhetons: number,
  level: number,
  playerName: string,
  avatarImage: HTMLImageElement | null,
  icons: Record<string, HTMLImageElement | null>,
  hoveredX: number,
  hoveredY: number,
  buttons: ButtonPosition[],
  topBarImage: HTMLImageElement | null = null,
  unreadNotifications: number = 0
) => {
  const topBarHeight = 55;
  
  // Фон верхней панели - металлический градиент (используется как подложка и fallback)
  const bgGradient = ctx.createLinearGradient(0, 0, 0, topBarHeight);
  bgGradient.addColorStop(0, 'rgba(60, 55, 50, 0.95)');
  bgGradient.addColorStop(0.5, 'rgba(80, 75, 65, 0.95)');
  bgGradient.addColorStop(1, 'rgba(50, 45, 40, 0.95)');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, topBarHeight);

  // Картинка фона панели: растягиваем с сохранением пропорций (cover) и обрезаем по высоте панели
  if (topBarImage && topBarImage.complete && topBarImage.naturalWidth > 0) {
    const imgRatio = topBarImage.naturalWidth / topBarImage.naturalHeight;
    const barRatio = width / topBarHeight;
    let drawWidth = width;
    let drawHeight = topBarHeight;
    if (imgRatio > barRatio) {
      drawHeight = topBarHeight;
      drawWidth = topBarHeight * imgRatio;
    } else {
      drawWidth = width;
      drawHeight = width / imgRatio;
    }
    const drawX = (width - drawWidth) / 2;
    const drawY = (topBarHeight - drawHeight) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, topBarHeight);
    ctx.clip();
    ctx.drawImage(topBarImage, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
  }
  
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
  
  // Фото профиля (аватар VK) или fallback на иконку
  const avatar = avatarImage && avatarImage.complete && avatarImage.naturalWidth > 0
    ? avatarImage
    : icons.personaz;
  
  if (avatar && avatar instanceof HTMLImageElement && avatar.complete) {
    // Круглая обрезка фото
    ctx.save();
    ctx.beginPath();
    ctx.arc(profileCenterX, profileCenterY, profileRadius - 2, 0, Math.PI * 2);
    ctx.clip();
    
    // Вписываем фото по центру с сохранением пропорций (cover)
    const imgRatio = avatar.naturalWidth / avatar.naturalHeight;
    const boxRatio = 1; // квадрат
    let drawW: number, drawH: number;
    if (imgRatio > boxRatio) {
      drawH = profileSize - 4;
      drawW = drawH * imgRatio;
    } else {
      drawW = profileSize - 4;
      drawH = drawW / imgRatio;
    }
    ctx.drawImage(
      avatar,
      profileCenterX - drawW / 2,
      profileCenterY - drawH / 2,
      drawW,
      drawH
    );
    ctx.restore();
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
  ctx.fillText(playerName || 'Игрок', profileX + profileSize + 8, profileY + 15);
  ctx.fillStyle = '#aaa';
  ctx.font = '10px Arial';
  ctx.fillText('LVL ' + level, profileX + profileSize + 8, profileY + 30);
  
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
  // Иконки ресурсов загружаются вместе с остальными изображениями интерфейса.

  const resIconSize = 18;
  const resCenterY = 27;   // единая вертикальная ось для всей капсулы
  let currentX = width - 12; // правый отступ

  // Вспомогательная функция отрисовки ресурса-капсулы: [иконка] [значение] [+]
  const drawResource = (
    value: number | string,
    iconImg: HTMLImageElement | null,
    fallbackEmoji: string,
    accentColor: string,
    plusId?: string
  ) => {
    // --- Габариты капсулы ---
    const valueText = String(value);
    ctx.font = 'bold 12px Arial';
    const valueWidth = ctx.measureText(valueText).width;
    const plusSize = 16;
    const plusGap = 3;
    const hasPlus = !!plusId;
    const capW = resIconSize + 4 + valueWidth + (hasPlus ? plusGap + plusSize : 0) + 12; // паддинги
    const capH = 26;
    const capX = currentX - capW;
    const capY = resCenterY - capH / 2;

    // --- Фон капсулы (тёмный, с акцентной рамкой ресурса) ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.roundRect(capX, capY, capW, capH, 13);
    ctx.fill();
    ctx.strokeStyle = accentColor + '88'; // полупрозрачный акцент
    ctx.lineWidth = 1;
    ctx.stroke();

    // --- Иконка (слева в капсуле) ---
    const iconX = capX + 6;
    if (iconImg && iconImg.complete && iconImg.naturalWidth > 0) {
      ctx.drawImage(iconImg, iconX, resCenterY - resIconSize / 2, resIconSize, resIconSize);
    } else {
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(fallbackEmoji, iconX, resCenterY);
    }

    // --- Значение (по центру капсулы) ---
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(valueText, iconX + resIconSize + 4, resCenterY);

    // --- Кнопка "+" (справа в капсуле) ---
    if (plusId) {
      const plusX = capX + capW - plusSize - 4;
      const plusY = resCenterY - plusSize / 2;
      const isPlusHovered = hoveredX > plusX && hoveredX < plusX + plusSize &&
                            hoveredY > plusY && hoveredY < plusY + plusSize;

      if (isPlusHovered) {
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 8;
      }
      ctx.fillStyle = isPlusHovered ? accentColor : 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.arc(plusX + plusSize / 2, resCenterY, plusSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = isPlusHovered ? '#fff' : accentColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Знак +
      ctx.strokeStyle = isPlusHovered ? '#000' : accentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(plusX + 4, resCenterY);
      ctx.lineTo(plusX + plusSize - 4, resCenterY);
      ctx.moveTo(plusX + plusSize / 2, plusY + 4);
      ctx.lineTo(plusX + plusSize / 2, plusY + plusSize - 4);
      ctx.stroke();

      buttons.push({ x: plusX - 2, y: plusY - 2, width: plusSize + 4, height: plusSize + 4, id: plusId });
    }

    // Кликабельная область всей капсулы не нужна — только кнопка "+"

    currentX = capX - 6; // следующий ресурс левее с зазором
  };

  // Плюс открывает модальное окно выбранного ресурса; сам баланс не меняется.
  // Премиум-золото не смешиваем с игровыми припасами — у него свой магазин.
  drawResource(zhetons, icons.zhetons, 'Ж', '#d8d0c0', 'restore_zhetons');
  drawResource(spicki, icons.spicki, 'С', '#d8d0c0', 'restore_spicki');
  drawResource(bullets, icons.bullets, 'П', '#d8d0c0', 'restore_bullets');
  drawResource(gold, icons.gold, 'Р', '#c9a227', 'restore_gold');
  drawResource(premiumGold, icons.premium, 'З', '#c9a227', 'open_donation_shop');
  drawResource(`${energy}/${maxEnergy}`, icons.energy, 'Э', '#d8d0c0', 'restore_energy');

  // ===== КНОПКА УВЕДОМЛЕНИЙ =====
  const notifSize = 26;
  const notifX = currentX - notifSize - 4;
  const notifY = resCenterY - notifSize / 2;
  const isNotifHovered = hoveredX > notifX && hoveredX < notifX + notifSize &&
                         hoveredY > notifY && hoveredY < notifY + notifSize;

  if (isNotifHovered) {
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 8;
  }
  ctx.fillStyle = isNotifHovered ? 'rgba(255, 215, 0, 0.25)' : 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.roundRect(notifX, notifY, notifSize, notifSize, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = isNotifHovered ? '#ffd700' : 'rgba(255, 215, 0, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Колокольчик
  ctx.font = '15px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🔔', notifX + notifSize / 2, notifY + notifSize / 2 + 1);

  // Бейдж с числом непрочитанных уведомлений
  const unread = unreadNotifications ?? 0;
  if (unread > 0) {
    const badgeText = unread > 9 ? '9+' : String(unread);
    ctx.font = 'bold 10px Arial';
    const badgeW = Math.max(16, ctx.measureText(badgeText).width + 10);
    const badgeH = 15;
    const badgeX = notifX + notifSize - badgeW + 7;
    const badgeY = notifY - 5;

    ctx.fillStyle = '#ff3333';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);
  }

  buttons.push({ x: notifX, y: notifY, width: notifSize, height: notifSize, id: 'notifications' });
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
  bosses: BossData[] = [],
  characterImage: HTMLImageElement | null = null,
  appearanceColor: string = '#d4a574',
  mapRaids: MapRaid[] = [],
  mapImage: HTMLImageElement | null = null,
  topBarImage: HTMLImageElement | null = null,
  hoverAnim: HoverAnim = EMPTY_HOVER_ANIM,
  bossScroll: number = 0,
  bossImage: HTMLImageElement | null = null,
  mapMessage: string = '',
  lockedRoomsRemain: boolean = false
): ButtonPosition[] => {
  const buttons: ButtonPosition[] = [];
  
  // ===== Оверлеи (рисуются ПЕРВЫМИ, верхняя панель будет поверх них) =====
  let overlayButtons: ButtonPosition[] | null = null;

  if (flags.showProfile && profileData) {
    overlayButtons = drawProfile(
      ctx,
      width,
      height,
      characterImage,
      appearanceColor,
      profileData,
      true,
      hoveredX,
      hoveredY,
      icons
    );
  } else if (flags.showBossModal) {
    overlayButtons = [];
    drawBossModal(ctx, width, height, bosses, icons, hoveredX, hoveredY, overlayButtons, bossScroll);
    overlayButtons.push({ x: width - 70, y: 15, width: 60, height: 30, id: 'close_boss_modal' });
    overlayButtons.push({ x: width / 2 - 60, y: height - 80, width: 120, height: 35, id: 'back_to_main' });
  } else if (flags.showMap) {
    overlayButtons = [];
    drawMapRaids(ctx, width, height, mapRaids, hoveredX, hoveredY, overlayButtons, mapImage, mapMessage, icons.energy);
  }

  // ===== Верхняя панель (рисуется ПОСЛЕДНЕЙ — видна везде, поверх оверлеев) =====
  drawTopBar(
    ctx,
    width,
    data.energy,
    data.maxEnergy,
    data.spicki,
    data.bullets,
    data.gold,
    data.premiumGold,
    data.zhetons,
    data.level,
    data.playerName || 'Игрок',
    data.avatarImage || null,
    icons,
    hoveredX,
    hoveredY,
    buttons,
    topBarImage,
    data.unreadNotifications ?? 0
  );

  // Бой с боссом — рисуется поверх всего и перехватывает все клики
  if (flags.battle) {
    trackFightHit(flags.battle);
    const fight = battleToFight(flags.battle, fightAnim, flags.battleResources);
    const fightButtons: ButtonPosition[] = [];
    drawBossFight(ctx, width, height, fight, icons, hoveredX, hoveredY, fightButtons, bossImage);
    return fightButtons;
  }

  // Кнопки оверлея добавляем после панели — чтобы клики по оверлею работали,
  // а клики по верхней панели обрабатывались первыми (панель идёт раньше в массиве)
  if (overlayButtons) {
    buttons.push(...overlayButtons);
    return buttons;
  }
  
  // ===== Боковые панели =====

  drawRightPanel(ctx, width, height, icons, hoveredX, hoveredY, buttons, carouselOffset, hoverAnim, lockedRoomsRemain);
  
  // ===== Нижние кнопки =====
  drawBottomButtons(ctx, width, height, icons, hoveredX, hoveredY, buttons, hoverAnim);
  
  return buttons;
};
