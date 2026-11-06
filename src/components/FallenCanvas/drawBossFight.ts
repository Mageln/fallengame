import type { BossFight, ButtonPosition } from './canvasTypes';
import { fitFont, getInitials, getRoomName } from './bossCanvasUtils';

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
  color: { active: string; idle: string; border: string; text: string },
  opts?: { sub?: string; disabled?: boolean }
) => {
  const disabled = opts?.disabled === true;
  const hovered = !disabled && hX > x && hX < x + w && hY > y && hY < y + h;

  // Неактивная кнопка затемняется, но остаётся кликабельной — reducer сам
  // объяснит причину («Приём ещё не готов: 2 ход») через lastMessage
  ctx.globalAlpha = disabled ? 0.55 : 1;
  ctx.fillStyle = disabled ? 'rgba(45, 45, 52, 0.9)' : hovered ? color.active : color.idle;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();

  ctx.strokeStyle = disabled ? '#55555f' : color.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (opts?.sub) {
    ctx.fillStyle = disabled ? '#9a9aa5' : color.text;
    ctx.font = `bold ${Math.round(h * 0.34)}px Arial`;
    ctx.fillText(label, x + w / 2, y + h * 0.36);
    ctx.font = `${Math.round(h * 0.22)}px Arial`;
    ctx.fillStyle = disabled ? '#7f7f8a' : 'rgba(255,255,255,0.72)';
    ctx.fillText(opts.sub, x + w / 2, y + h * 0.7);
  } else {
    ctx.fillStyle = color.text;
    ctx.font = `bold ${Math.round(h * 0.42)}px Arial`;
    ctx.fillText(label, x + w / 2, y + h / 2);
  }

  ctx.globalAlpha = 1;

  buttons.push({ x, y, width: w, height: h, id });
};

export const drawBossFight = (
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

  // Урон по боссу — всплывает по центру экрана (крит — оранжевый, 3-й этап)
  if (fight.lastDamage > 0 && now - fight.bossHitAt < 800) {
    const p = (now - fight.bossHitAt) / 800;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.fillStyle = fight.crit ? '#ff8c1a' : '#ffe066';
    ctx.font = `bold ${Math.round((fight.crit ? 50 : 40) * s)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(`${fight.crit ? 'КРИТ ' : ''}-${fight.lastDamage}`, width / 2, height * 0.45 - p * 40 * s);
    ctx.restore();
  }

  // Промах — серым над боссом (3-й этап)
  if (fight.missAt && now - fight.missAt < 700) {
    const p = (now - fight.missAt) / 700;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.fillStyle = '#b9b9c4';
    ctx.font = `bold ${Math.round(30 * s)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('ПРОМАХ', width / 2, height * 0.45 - p * 30 * s);
    ctx.restore();
  }

  // Кнопки внизу: сетка 3×3 — обычные удары, спецприёмы, защита, расходники
  const buttonsH = Math.round(44 * s);
  const gap = Math.round(10 * s);
  const COLS = 3;
  const ROWS = 3;
  const btnW = (uiW - (COLS - 1) * gap) / COLS;
  // Нижняя строка — используется окнами победы/поражения (одна широкая кнопка)
  const btnY = height - pad - buttonsH;
  const gridH = ROWS * buttonsH + (ROWS - 1) * gap;
  const gridY = height - pad - gridH;

  // Счётчик ходов — под полосой здоровья босса
  if (fight.turn && fight.turnLimit) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `bold ${Math.round(13 * s)}px Arial`;
    ctx.fillText(
      `ХОД ${fight.turn} / ${fight.turnLimit}`,
      width / 2,
      pad + Math.round(36 * s) + barH + Math.round(16 * s)
    );
  }

  // Полоса здоровья игрока — над сеткой кнопок
  const hpBarY = gridY - gap - barH;
  drawHpBar(ctx, uiX, hpBarY, uiW, barH, fight.playerHp, fight.playerMaxHp, 'ГЕРОЙ');

  // Индикаторы статусов — над полосой игрока
  const chips: Array<{ text: string; color: string }> = [];
  if (fight.stunTurns && fight.stunTurns > 0) chips.push({ text: 'ОГЛУШЕНИЕ', color: '#e0b400' });
  if (fight.poisonTurns && fight.poisonTurns > 0)
    chips.push({ text: `ЯД ${fight.poisonDamage ?? 0}/ход`, color: '#4ecb4e' });
  if (fight.weakPointTurns && fight.weakPointTurns > 0)
    chips.push({ text: 'СЛАБОЕ МЕСТО', color: '#ff7a3c' });
  if (chips.length > 0) {
    const chipH = Math.round(18 * s);
    const chipY = hpBarY - gap - chipH;
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(11 * s)}px Arial`;
    let chipX = uiX;
    for (const chip of chips) {
      const tw = ctx.measureText(chip.text).width;
      const cw = Math.round(tw + 16 * s);
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.beginPath();
      ctx.roundRect(chipX, chipY, cw, chipH, 5);
      ctx.fill();
      ctx.strokeStyle = chip.color;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = chip.color;
      ctx.textAlign = 'center';
      ctx.fillText(chip.text, chipX + cw / 2, chipY + chipH / 2);
      chipX += cw + Math.round(6 * s);
    }
  }

  if (fight.outcome === 'fighting') {
    const cd = fight.cooldowns ?? { technique: 0, power: 0, combo: 0, evade: 0 };
    const medkits = fight.medkits ?? 0;
    const grenades = fight.grenades ?? 0;

    const RED = { active: 'rgba(200, 40, 40, 0.95)', idle: 'rgba(140, 20, 20, 0.9)', border: '#ff5555', text: '#ffffff' };
    const ORANGE = { active: 'rgba(190, 110, 20, 0.95)', idle: 'rgba(120, 65, 15, 0.9)', border: '#ffa030', text: '#ffffff' };
    const BLUE = { active: 'rgba(40, 90, 170, 0.95)', idle: 'rgba(25, 55, 110, 0.9)', border: '#5588ff', text: '#dde8ff' };
    const GREEN = { active: 'rgba(40, 140, 70, 0.95)', idle: 'rgba(25, 90, 45, 0.9)', border: '#4fbb6a', text: '#e6ffe9' };
    const GRAY = { active: 'rgba(80, 80, 110, 0.95)', idle: 'rgba(50, 50, 80, 0.85)', border: '#7777aa', text: '#ddddff' };

    // Метка кулдауна: «готов через N ходов», иначе — описание эффекта
    const cdLabel = (turns: number, effect: string) => (turns > 0 ? `готов: ${turns}` : effect);

    const actions: Array<{
      id: string;
      label: string;
      sub: string;
      color: { active: string; idle: string; border: string; text: string };
      disabled?: boolean;
    }> = [
      { id: 'fight_attack', label: 'Удар', sub: '1 патрон', color: RED },
      { id: 'fight_technique', label: 'Приём', sub: cdLabel(cd.technique, '×1.35'), color: ORANGE, disabled: cd.technique > 0 },
      { id: 'fight_power', label: 'Мощный', sub: cdLabel(cd.power, '×1.6'), color: ORANGE, disabled: cd.power > 0 },
      { id: 'fight_combo', label: 'Серия', sub: cdLabel(cd.combo, '3 удара'), color: ORANGE, disabled: cd.combo > 0 },
      { id: 'fight_block', label: 'Блок', sub: 'входящий ×0.4', color: BLUE },
      { id: 'fight_evade', label: 'Уклон', sub: cdLabel(cd.evade, 'игнор удара'), color: BLUE, disabled: cd.evade > 0 },
      { id: 'fight_heal', label: 'Аптечка', sub: `есть ${medkits}`, color: GREEN, disabled: medkits <= 0 },
      { id: 'fight_grenade', label: 'Граната', sub: `есть ${grenades}`, color: GREEN, disabled: grenades <= 0 },
      { id: 'fight_leave', label: 'Отступить', sub: 'сохранить урон', color: GRAY },
    ];

    actions.forEach((a, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      drawFightButton(
        ctx,
        uiX + col * (btnW + gap),
        gridY + row * (buttonsH + gap),
        btnW,
        buttonsH,
        a.label,
        hX,
        hY,
        buttons,
        a.id,
        a.color,
        { sub: a.sub, disabled: a.disabled }
      );
    });
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
    const panelH = Math.round(150 * s) + rowH * 3; // золот, патроны, комната
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
      ry += rowH;
      const room = fight.reward?.room;
      if (room) {
        const roomName = getRoomName(room);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#cccccc';
        ctx.font = `${Math.round(14 * s)}px Arial`;
        ctx.fillText('Комната', panelX + Math.round(24 * s), ry + rowH / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#77dd77';
        ctx.font = `bold ${Math.round(14 * s)}px Arial`;
        ctx.fillText(roomName, panelX + panelW - Math.round(24 * s), ry + rowH / 2);
        ctx.textAlign = 'left';
      }
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
      hpBarY - Math.round(26 * s)
    );
    drawFightButton(
      ctx, uiX, btnY, uiW, buttonsH, 'Закрыть', hX, hY, buttons, 'fight_leave',
      { active: 'rgba(80, 80, 110, 0.95)', idle: 'rgba(50, 50, 80, 0.85)', border: '#7777aa', text: '#ddddff' }
    );
  }
};

// Модальное окно боссов - на весь canvas с отдельным фоном
