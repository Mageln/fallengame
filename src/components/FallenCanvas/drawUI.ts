// Отрисовка UI внутри Canvas

import type { BattleState } from '../../game/types';
import { drawProfile } from './drawProfile';
import { getVisibleBounds } from './iconBounds';

// === Анимации боя: вычисляются из изменений HP (модульное состояние) ===
const _fightAnim = {
  key: '',
  bossHp: 0,
  playerHp: 0,
  bossHitAt: 0,
  playerHitAt: 0,
  lastDamage: 0,
};

const trackFightHit = (battle: BattleState) => {
  const key = `${battle.bossId}:${battle.startedAt}`;
  if (_fightAnim.key !== key) {
    _fightAnim.key = key;
    _fightAnim.bossHp = battle.bossHp;
    _fightAnim.playerHp = battle.playerHp;
    _fightAnim.bossHitAt = 0;
    _fightAnim.playerHitAt = 0;
    _fightAnim.lastDamage = 0;
    return;
  }
  if (battle.bossHp < _fightAnim.bossHp) {
    _fightAnim.bossHitAt = performance.now();
    _fightAnim.lastDamage = _fightAnim.bossHp - battle.bossHp;
  }
  if (battle.playerHp < _fightAnim.playerHp) {
    _fightAnim.playerHitAt = performance.now();
  }
  _fightAnim.bossHp = battle.bossHp;
  _fightAnim.playerHp = battle.playerHp;
};

export interface ButtonPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
}

export interface UIFlags {
  showProfile?: boolean;
  showBossModal?: boolean;
  showMap?: boolean;
  playerName?: string;
  battle?: BattleState | null;
  // Расходники игрока для кнопок боя (в BattleState их нет — это ресурсы GameState)
  battleResources?: { medkits: number; grenades: number };
}

export interface MapRaid {
  id: string;
  x: number;
  y: number;
  type: 'yellow' | 'red';
  name: string;
  isRunning: boolean;
  completed: boolean;
  energyCost?: number;
  startTime?: number;
  endTime?: number;
}

// Универсальная кнопка "Назад"
const drawBackButton = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  isHovered: boolean,
  buttons: ButtonPosition[]
) => {
  const bgColor = isHovered ? 'rgba(255, 100, 100, 0.8)' : 'rgba(200, 50, 50, 0.6)';
  
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();
  
  ctx.strokeStyle = '#ff6666';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.stroke();
  
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('← Назад', x + width / 2, y + height / 2);
  
  buttons.push({ x, y, width, height, id: 'back_to_main' });
};

export interface GameData {
  energy: number;
  maxEnergy: number;
  authority: number;
  spicki: number;
  bullets: number;
  gold: number;
  zhetons: number;
  level: number;
  carLevel: number;
  districtName: string;
  playerName?: string;
  avatarImage?: HTMLImageElement | null;
  unreadNotifications?: number;
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
  subtitle: string;
  description: string;
  requirements: string;
  color: string;
  level: number;
  isSpecial: boolean;
  attackReward: { gold: number; bullets: number; zones: number };
  soloReward: { gold: number; bullets: number; tokens: number };
}

// Состояние боя с боссом — модальное окно поверх остального интерфейса.
// Временные значения (текущее ХП, тайминги анимаций) живут в компоненте,
// отрисовка полностью строится от них и от performance.now().
export interface BossFight {
  bossId: string;
  bossName: string;
  bossColor: string;
  bossHp: number;
  bossMaxHp: number;
  playerHp: number;
  playerMaxHp: number;
  startedAt: number;
  bossHitAt: number;
  playerHitAt: number;
  lastDamage: number;
  outcome: 'fighting' | 'won' | 'lost';
  endedAt?: number;
  reward?: { gold: number; bullets: number };
  // ── Этап 3: боевые действия ──
  turn?: number;
  turnLimit?: number;
  cooldowns?: { technique: number; power: number; combo: number; evade: number };
  stunTurns?: number;
  poisonTurns?: number;
  poisonDamage?: number;
  weakPointTurns?: number;
  medkits?: number;
  grenades?: number;
  lastHit?: { damage: number; crit: boolean; missed: boolean } | null;
}

// Адаптер BattleState → BossFight для анимаций боя
const battleToFight = (battle: BattleState, anim: typeof _fightAnim, res?: { medkits: number; grenades: number }): BossFight => ({
  bossId: battle.bossId,
  bossName: battle.bossName,
  bossColor: '#aa3333',
  bossHp: battle.bossHp,
  bossMaxHp: battle.bossMaxHp,
  playerHp: battle.playerHp,
  playerMaxHp: battle.playerMaxHp,
  startedAt: battle.startedAt,
  bossHitAt: anim.bossHitAt ?? 0,
  playerHitAt: anim.playerHitAt ?? 0,
  lastDamage: anim.lastDamage,
  outcome: battle.outcome,
  endedAt: battle.endedAt ?? undefined,
  reward: battle.reward ? { gold: battle.reward.gold, bullets: battle.reward.bullets } : undefined,
  turn: battle.turn,
  turnLimit: battle.turnLimit,
  cooldowns: battle.cooldowns,
  stunTurns: battle.statuses.stunTurns,
  poisonTurns: battle.statuses.poisonTurns,
  poisonDamage: battle.statuses.poisonDamage,
  weakPointTurns: battle.weakPointTurns,
  medkits: res?.medkits ?? 0,
  grenades: res?.grenades ?? 0,
  lastHit: battle.lastHit,
});

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


// ===== ПРАВАЯ ПАНЕЛЬ (карусель иконок: видно по 3, стрелки вверх/вниз) =====
const RIGHT_PANEL_ITEMS = [
  { action: 'go_battle', iconKey: 'arena', label: 'Арена' },
  { action: 'go_district', iconKey: 'raion', label: 'Районы' },
  { action: 'go_boss', iconKey: 'boss', label: 'Боссы' },
  { action: 'go_kazino', iconKey: 'kazino', label: 'Казино' },
  { action: 'go_cloth', iconKey: 'cloth', label: 'Одежда' },
  { action: 'go_komnata', iconKey: 'komnata', label: 'Комната' },
];

const RIGHT_PANEL_VISIBLE = 3;
export const RIGHT_PANEL_MAX_OFFSET = Math.max(0, RIGHT_PANEL_ITEMS.length - RIGHT_PANEL_VISIBLE);

// Анимация наведения: scale — увеличение, shakeX/shakeY/rot — тряска при удержании курсора
export interface HoverAnim {
  id: string | null;
  scale: number;
  shakeX: number;
  shakeY: number;
  rot: number;
}

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
  hoverAnim: HoverAnim = EMPTY_HOVER_ANIM
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

    // Иконка из картинки
    const icon = icons[item.iconKey];
    if (icon && icon instanceof HTMLImageElement && icon.complete) {
      ctx.drawImage(icon, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
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
  // Иконки из public/icon/resource: zheton.png, gold.png, spicki.png, bullets.png, energy.png

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

  // Порядок справа налево: жетоны, спички, патроны, золото, энергия
  drawResource(zhetons, icons.zhetons, '🎰', '#fff', 'restore_zhetons');
  drawResource(spicki, icons.spicki, '🔥', '#ff8844', 'restore_spicki');
  drawResource(bullets, icons.bullets, '🔫', '#ccc', 'restore_bullets');
  drawResource(gold, icons.gold, '💰', '#ffd700', 'restore_gold');
  drawResource(`${energy}/${maxEnergy}`, icons.energy, '⚡', '#ffaa00', 'restore_energy');

  // ===== КНОПКА FULLSCREEN (правее ресурсов, на одном уровне) =====
  // currentX указывает на левый край последней капсулы — рисуем кнопку левее
  const fsBtnSize = 26;
  const fsBtnX = currentX - fsBtnSize - 4;
  const fsBtnY = resCenterY - fsBtnSize / 2;
  const isFsHovered = hoveredX > fsBtnX && hoveredX < fsBtnX + fsBtnSize &&
                      hoveredY > fsBtnY && hoveredY < fsBtnY + fsBtnSize;

  if (isFsHovered) {
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 8;
  }
  ctx.fillStyle = isFsHovered ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.roundRect(fsBtnX, fsBtnY, fsBtnSize, fsBtnSize, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = isFsHovered ? '#fff' : 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Иконка fullscreen (уголки)
  ctx.strokeStyle = isFsHovered ? '#fff' : 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2;
  const m = 7; // отступ уголков от края кнопки
  const c = 5; // длина уголка
  // Верхний левый угол
  ctx.beginPath();
  ctx.moveTo(fsBtnX + m, fsBtnY + m + c);
  ctx.lineTo(fsBtnX + m, fsBtnY + m);
  ctx.lineTo(fsBtnX + m + c, fsBtnY + m);
  // Верхний правый угол
  ctx.moveTo(fsBtnX + fsBtnSize - m - c, fsBtnY + m);
  ctx.lineTo(fsBtnX + fsBtnSize - m, fsBtnY + m);
  ctx.lineTo(fsBtnX + fsBtnSize - m, fsBtnY + m + c);
  // Нижний правый угол
  ctx.moveTo(fsBtnX + fsBtnSize - m, fsBtnY + fsBtnSize - m - c);
  ctx.lineTo(fsBtnX + fsBtnSize - m, fsBtnY + fsBtnSize - m);
  ctx.lineTo(fsBtnX + fsBtnSize - m - c, fsBtnY + fsBtnSize - m);
  // Нижний левый угол
  ctx.moveTo(fsBtnX + m + c, fsBtnY + fsBtnSize - m);
  ctx.lineTo(fsBtnX + m, fsBtnY + fsBtnSize - m);
  ctx.lineTo(fsBtnX + m, fsBtnY + fsBtnSize - m - c);
  ctx.stroke();

  buttons.push({ x: fsBtnX, y: fsBtnY, width: fsBtnSize, height: fsBtnSize, id: 'toggle_fullscreen' });

  // ===== КНОПКА УВЕДОМЛЕНИЙ (левее fullscreen) =====
  const notifSize = 26;
  const notifX = fsBtnX - notifSize - 6;
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
  mapMessage: string = ''
): ButtonPosition[] => {
  const buttons: ButtonPosition[] = [];
  
  // ===== Оверлеи (рисуются ПЕРВЫМИ, верхняя панель будет поверх них) =====
  let overlayButtons: ButtonPosition[] | null = null;

  if (flags.showProfile && profileData) {
    overlayButtons = drawProfile(
      ctx,
      width,
      height,
      icons,
      characterImage,
      appearanceColor,
      profileData,
      true,
      hoveredX,
      hoveredY
    );
  } else if (flags.showBossModal) {
    overlayButtons = [];
    drawBossModal(ctx, width, height, bosses, icons, hoveredX, hoveredY, overlayButtons, bossScroll);
    overlayButtons.push({ x: width - 70, y: 15, width: 60, height: 30, id: 'close_boss_modal' });
    overlayButtons.push({ x: width / 2 - 60, y: height - 80, width: 120, height: 35, id: 'back_to_main' });
  } else if (flags.showMap) {
    overlayButtons = [];
    drawMapRaids(ctx, width, height, mapRaids, hoveredX, hoveredY, overlayButtons, mapImage, mapMessage);
  }

  // ===== Верхняя панель (рисуется ПОСЛЕДНЕЙ — видна везде, поверх оверлеев) =====
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
    const fight = battleToFight(flags.battle, _fightAnim, flags.battleResources);
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

  drawRightPanel(ctx, width, height, icons, hoveredX, hoveredY, buttons, carouselOffset, hoverAnim);
  
  // ===== Нижние кнопки =====
  drawBottomButtons(ctx, width, height, icons, hoveredX, hoveredY, buttons, hoverAnim);
  
  return buttons;
};
const drawMapRaids = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  raids: MapRaid[],
  hoveredX: number,
  hoveredY: number,
  buttons: ButtonPosition[],
  mapImage: HTMLImageElement | null = null,
  message: string = ''
) => {
  // Фон карты
  ctx.fillStyle = 'rgba(10, 15, 20, 0.9)';
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 0);
  ctx.fill();
  
  // Рисуем изображение карты если есть
  if (mapImage instanceof HTMLImageElement && mapImage.complete && mapImage.naturalWidth > 0) {
    ctx.drawImage(mapImage, 0, 0, width, height);
  } else {
    // Если нет изображения — рисуем тёмный фон с сеткой
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, 0, width, height);
    
    // Сетка
    ctx.strokeStyle = 'rgba(100, 150, 100, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }
    
    // Заголовок
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🗺️ КАРТА РАЙОНОВ', width / 2, 75);
  }
  
  // Кнопка назад (ниже верхней панели, высота которой 55)
  const backBtnX = 20;
  const backBtnY = 65;
  const isBackHovered = hoveredX > backBtnX && hoveredX < backBtnX + 100 && hoveredY > backBtnY && hoveredY < backBtnY + 40;
  
  ctx.fillStyle = isBackHovered ? 'rgba(255, 100, 100, 0.8)' : 'rgba(200, 50, 50, 0.6)';
  ctx.beginPath();
  ctx.roundRect(backBtnX, backBtnY, 100, 40, 10);
  ctx.fill();
  
  ctx.strokeStyle = '#ff6666';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(backBtnX, backBtnY, 100, 40, 10);
  ctx.stroke();
  
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('← Назад', backBtnX + 50, backBtnY + 20);
  
  buttons.push({ x: backBtnX, y: backBtnY, width: 100, height: 40, id: 'back_to_main' });
  
  // Рисуем отметки рейдов
  const now = Date.now();
  let runningCount = 0;
  let readyCount = 0;

  const formatRaidTime = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  raids.forEach((raid) => {
    const x = (raid.x / 100) * width;
    const y = (raid.y / 100) * height;
    const radius = raid.type === 'red' ? 25 : 20;

    const isHovered = hoveredX > x - radius && hoveredX < x + radius && hoveredY > y - radius && hoveredY < y + radius;

    // Рейд идёт и время уже вышло — награда ждёт получения
    const ready = !raid.completed && raid.isRunning && !!raid.endTime && now >= raid.endTime;
    if (ready) readyCount++;
    else if (raid.isRunning) runningCount++;

    // Цвет в зависимости от статуса
    let color: string;
    if (ready) {
      color = '#00ff88';
    } else if (raid.completed) {
      color = '#00cc66';
    } else if (raid.isRunning) {
      color = '#ffaa00';
    } else {
      color = raid.type === 'red' ? '#ff4444' : '#ffaa00';
    }

    // Свечение
    ctx.shadowColor = color;
    ctx.shadowBlur = isHovered ? 25 : 15;

    // Круг
    ctx.fillStyle = isHovered ? `${color}cc` : `${color}88`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Обводка
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Иконка внутри круга
    ctx.fillStyle = '#fff';
    ctx.font = `${raid.type === 'red' ? 24 : 20}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icon = ready ? '💰' : raid.completed ? '✅' : raid.isRunning ? '⏳' : '⚠️';
    ctx.fillText(icon, x, y);

    ctx.shadowBlur = 0;

    // Подпись
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(raid.name, x, y + radius + 15);

    // Статус: обратный отсчёт, «Готово» или длительность
    let statusText: string;
    let statusColor: string;
    if (ready) {
      statusText = 'Готово! Забрать';
      statusColor = '#00ff88';
    } else if (raid.isRunning && raid.endTime) {
      statusText = formatRaidTime(raid.endTime - now);
      statusColor = '#ffaa00';
    } else if (raid.completed) {
      statusText = 'Завершён';
      statusColor = '#00cc66';
    } else {
      statusText = raid.type === 'red' ? '30 мин' : '15 мин';
      statusColor = '#aaa';
    }
    ctx.fillStyle = statusColor;
    ctx.font = '10px Arial';
    ctx.fillText(statusText, x, y + radius + 28);

    // Затраты энергии рядом с иконкой (только для рейда, который ещё не запущен)
    if (!raid.completed && !raid.isRunning) {
      const energyText = String(raid.energyCost ?? (raid.type === 'red' ? 20 : 15));
      ctx.font = 'bold 10px Arial';
      const badgeW = ctx.measureText(energyText).width + 26; // место под ⚡ и паддинги
      const badgeH = 16;
      const badgeX = x + radius - 4;  // правый верхний край кружка рейда
      const badgeY = y - radius - 6;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
      ctx.fill();
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Молния
      ctx.fillStyle = '#ffaa00';
      ctx.font = '9px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', badgeX + 4, badgeY + badgeH / 2 + 1);

      // Число
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Arial';
      ctx.fillText(energyText, badgeX + 15, badgeY + badgeH / 2 + 1);
    }

    buttons.push({ x: x - radius, y: y - radius, width: radius * 2, height: radius * 2, id: `raid_${raid.id}` });
  });

  // Счётчик активных рейдов под верхней панелью справа
  if (runningCount > 0 || readyCount > 0) {
    const parts: string[] = [];
    if (runningCount > 0) parts.push(`⏳ идут: ${runningCount}`);
    if (readyCount > 0) parts.push(`💰 готовы: ${readyCount}`);
    const text = parts.join('   ');

    ctx.font = 'bold 12px Arial';
    const textWidth = ctx.measureText(text).width;
    const boxW = textWidth + 24;
    const boxH = 28;
    const boxX = width - boxW - 20;
    const boxY = 65;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();
    ctx.strokeStyle = readyCount > 0 ? '#00ff88' : '#ffaa00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, boxX + boxW / 2, boxY + boxH / 2 + 1);
  }


  // Плашка с последним сообщением (например, почему рейд не запустился)
  if (message) {
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textWidth = ctx.measureText(message).width;
    const boxW = Math.min(width - 40, textWidth + 40);
    const boxH = 34;
    const boxX = (width - boxW) / 2;
    const boxY = height - boxH - 16;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 10);
    ctx.fill();
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 10);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.fillText(message, width / 2, boxY + boxH / 2 + 1);
  }
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

// ===== Модалка боссов: по 2 босса на экране, прокрутка колесом =====
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

// Подбор размера шрифта, чтобы текст влез в заданную ширину
const fitFont = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  baseSize: number,
  weight = 'bold'
) => {
  let size = baseSize;
  ctx.font = `${weight} ${size}px Arial`;
  while (size > 7 && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = `${weight} ${size}px Arial`;
  }
  return size;
};

// Инициалы вместо смайлов (для заглушек аватаров)
const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('');

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
const drawFightSprite = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  size: number,
  fallbackColor: string,
  fallbackText: string
) => {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 10);
  ctx.clip();

  ctx.fillStyle = fallbackColor;
  ctx.fillRect(x, y, size, size);

  if (image) {
    // Вписываем изображение с сохранением пропорций (contain)
    const ratio = Math.min(size / image.width, size / image.height);
    const dw = image.width * ratio;
    const dh = image.height * ratio;
    ctx.drawImage(image, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(size * 0.22)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fallbackText, x + size / 2, y + size / 2);
  }

  ctx.restore();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 10);
  ctx.stroke();
};

const drawHpBar = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  current: number,
  max: number,
  label: string
) => {
  const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();

  if (ratio > 0) {
    ctx.fillStyle = ratio > 0.5 ? '#3fae4a' : ratio > 0.25 ? '#d8a12a' : '#c0392b';
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(3, w * ratio), h, 4);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(h * 0.7)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${label} ${Math.ceil(Math.max(0, current))} / ${max}`, x + w / 2, y + h / 2);
};

const drawFightButton = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  hX: number,
  hY: number,
  buttons: ButtonPosition[],
  id: string,
  color: { active: string; idle: string; border: string; text: string }
) => {
  const hovered = hX > x && hX < x + w && hY > y && hY < y + h;

  ctx.fillStyle = hovered ? color.active : color.idle;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();

  ctx.strokeStyle = color.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.stroke();

  ctx.fillStyle = color.text;
  ctx.font = `bold ${Math.round(h * 0.42)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);

  buttons.push({ x, y, width: w, height: h, id });
};

const drawBossFight = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fight: BossFight,
  icons: Record<string, HTMLImageElement | null>,
  hX: number,
  hY: number,
  buttons: ButtonPosition[],
  bossImage: HTMLImageElement | null = null
) => {
  const now = performance.now();

  // Бой занимает весь экран: полностью перекрываем остальной интерфейс
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, width, height);

  const hitWindow = 340;
  const hurt = (t: number) => Math.min(1, (now - t) / hitWindow);
  const bossHurt = hurt(fight.bossHitAt);
  const playerHurt = hurt(fight.playerHitAt);

  // Босс на весь экран + лёгкая анимация:
  // «дыхание», покачивание в простое, тряска при попадании
  const bossShake = bossHurt < 1 ? Math.sin(bossHurt * Math.PI * 5) * (1 - bossHurt) * 14 : 0;
  const bossBreath = 1 + Math.sin(now / 900) * 0.02;
  const idleY = Math.sin(now / 520) * 6;

  ctx.save();
  ctx.translate(bossShake, idleY);
  ctx.translate(width / 2, height / 2);
  ctx.scale(bossBreath, bossBreath);
  ctx.translate(-width / 2, -height / 2);

  if (bossImage && bossImage.complete && bossImage.naturalWidth > 0) {
    // Босс растянут на весь экран (cover по центру)
    const imgRatio = bossImage.naturalWidth / bossImage.naturalHeight;
    const boxRatio = width / height;
    let dw = width;
    let dh = height;
    if (imgRatio > boxRatio) dw = height * imgRatio;
    else dh = width / imgRatio;
    ctx.drawImage(bossImage, (width - dw) / 2, (height - dh) / 2, dw, dh);
  } else {
    // Запасной вариант, если картинка не загрузилась
    const size = Math.min(width, height) * 0.65;
    drawFightSprite(
      ctx,
      icons.boss || null,
      (width - size) / 2,
      (height - size) / 2,
      size,
      `${fight.bossColor}55`,
      getInitials(fight.bossName)
    );
  }
  ctx.restore();

  // Красная вспышка на весь экран, когда босс получает урон
  if (bossHurt < 1) {
    ctx.save();
    ctx.globalAlpha = (1 - bossHurt) * 0.35;
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // Затемнение, когда бьёт босс
  if (playerHurt < 1) {
    ctx.save();
    ctx.globalAlpha = (1 - playerHurt) * 0.4;
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.25,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );
    vignette.addColorStop(0, 'rgba(255, 60, 40, 0)');
    vignette.addColorStop(1, 'rgba(255, 40, 20, 0.9)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // Затемнения сверху и снизу, чтобы текст и кнопки читались поверх картинки
  const fadeH = Math.round(Math.min(height * 0.3, 200));
  const topFade = ctx.createLinearGradient(0, 0, 0, fadeH);
  topFade.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
  topFade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topFade;
  ctx.fillRect(0, 0, width, fadeH);

  const bottomFade = ctx.createLinearGradient(0, height, 0, height - fadeH);
  bottomFade.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
  bottomFade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bottomFade;
  ctx.fillRect(0, height - fadeH, width, fadeH);

  const s = Math.max(0.8, Math.min(1.3, Math.min(width, height) / 700));
  const pad = Math.round(16 * s);
  const uiW = Math.min(width - pad * 2, 620);
  const uiX = (width - uiW) / 2;

  // Заголовок
  ctx.fillStyle = '#ff5555';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, `БОЙ: ${fight.bossName}`, uiW, Math.round(26 * s));
  ctx.fillText(`БОЙ: ${fight.bossName}`, width / 2, pad + Math.round(12 * s));

  // Полоса здоровья босса
  const barH = Math.round(20 * s);
  drawHpBar(ctx, uiX, pad + Math.round(36 * s), uiW, barH, fight.bossHp, fight.bossMaxHp, 'БОСС');

  // Урон по боссу — всплывает по центру экрана
  if (fight.lastDamage > 0 && now - fight.bossHitAt < 800) {
    const p = (now - fight.bossHitAt) / 800;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.fillStyle = '#ffe066';
    ctx.font = `bold ${Math.round(40 * s)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(`-${fight.lastDamage}`, width / 2, height * 0.45 - p * 40 * s);
    ctx.restore();
  }

  // Кнопки внизу
  const buttonsH = Math.round(46 * s);
  const gap = Math.round(12 * s);
  const btnW = (uiW - gap) / 2;
  const btnY = height - pad - buttonsH;

  // Полоса здоровья игрока — над кнопками
  drawHpBar(
    ctx,
    uiX,
    btnY - gap - barH,
    uiW,
    barH,
    fight.playerHp,
    fight.playerMaxHp,
    'ГЕРОЙ'
  );

  if (fight.outcome === 'fighting') {
    drawFightButton(
      ctx, uiX, btnY, btnW, buttonsH, 'Удар', hX, hY, buttons, 'fight_attack',
      { active: 'rgba(200, 40, 40, 0.95)', idle: 'rgba(140, 20, 20, 0.9)', border: '#ff5555', text: '#ffffff' }
    );
    drawFightButton(
      ctx, uiX + btnW + gap, btnY, btnW, buttonsH, 'Отступить', hX, hY, buttons, 'fight_leave',
      { active: 'rgba(80, 80, 110, 0.95)', idle: 'rgba(50, 50, 80, 0.85)', border: '#7777aa', text: '#ddddff' }
    );
  } else if (fight.outcome === 'won') {
    // Победа: панель с наградой поверх сцены боя
    const gold = fight.reward?.gold ?? 0;
    const bullets = fight.reward?.bullets ?? 0;
    const appearedAt = fight.endedAt ?? now;
    const p = Math.min(1, (now - appearedAt) / 260);

    ctx.save();
    ctx.globalAlpha = 0.6 * p;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    const rowH = Math.round(34 * s);
    const panelW = Math.min(uiW, 380);
    const panelH = Math.round(150 * s) + rowH * 2;
    const panelX = (width - panelW) / 2;
    const panelCY = height * 0.46;
    const panelY = panelCY - (panelH * p) / 2;
    const curH = panelH * p;

    ctx.save();
    ctx.fillStyle = 'rgba(12, 18, 12, 0.96)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, curH, 14);
    ctx.fill();
    ctx.strokeStyle = '#5aa85a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    if (p >= 1) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#77dd77';
      ctx.font = `bold ${Math.round(26 * s)}px Arial`;
      ctx.fillText('БОСС ПОВЕРЖЕН', width / 2, panelY + Math.round(34 * s));

      ctx.fillStyle = '#999999';
      ctx.font = `${Math.round(13 * s)}px Arial`;
      ctx.fillText('Награда за победу', width / 2, panelY + Math.round(60 * s));

      const drawRewardRow = (label: string, value: number, color: string, img: HTMLImageElement | null, y: number) => {
        const rowY = y;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.roundRect(panelX + Math.round(14 * s), rowY, panelW - Math.round(28 * s), rowH - Math.round(6 * s), 6);
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#cccccc';
        ctx.font = `${Math.round(14 * s)}px Arial`;
        ctx.fillText(label, panelX + Math.round(24 * s), rowY + rowH / 2);

        const iconSize = Math.round(20 * s);
        const textW = ctx.measureText(`+${value}`).width;
        const groupW = iconSize + 8 + textW;
        const startX = panelX + panelW - Math.round(24 * s) - groupW;
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, startX, rowY + (rowH - iconSize) / 2, iconSize, iconSize);
        }
        ctx.textAlign = 'right';
        ctx.fillStyle = color;
        ctx.font = `bold ${Math.round(15 * s)}px Arial`;
        ctx.fillText(`+${value}`, panelX + panelW - Math.round(24 * s), rowY + rowH / 2);
      };

      let ry = panelY + Math.round(76 * s);
      drawRewardRow('Золото', gold, '#ffd700', icons.gold ?? null, ry);
      ry += rowH;
      drawRewardRow('Патроны', bullets, '#ffffff', icons.bullets ?? null, ry);
      ctx.textAlign = 'left';
    }

    drawFightButton(
      ctx, uiX, btnY, uiW, buttonsH, 'Забрать', hX, hY, buttons, 'fight_leave',
      { active: 'rgba(50, 120, 60, 0.95)', idle: 'rgba(30, 80, 40, 0.9)', border: '#5aa85a', text: '#ffffff' }
    );
  } else {
    ctx.fillStyle = '#ff6666';
    ctx.font = `bold ${Math.round(22 * s)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(
      'ВЫ ВЫБЫЛИ ИЗ БОЯ',
      width / 2,
      btnY - gap - barH - Math.round(22 * s)
    );
    drawFightButton(
      ctx, uiX, btnY, uiW, buttonsH, 'Закрыть', hX, hY, buttons, 'fight_leave',
      { active: 'rgba(80, 80, 110, 0.95)', idle: 'rgba(50, 50, 80, 0.85)', border: '#7777aa', text: '#ddddff' }
    );
  }
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

