// Кнопка «Комната» — ржавая дверь убежища (рисуется на канвасе в правой панели).
// Сам экран «Убежища» теперь рендерится React-компонентом RoomModal (в стиле клана).

// Палитра из ТЗ.
const C = {
  rust: '#6b4a2f',
  rustLight: '#8a5f3c',
  rustDark: '#3a2a1a',
  blood: '#8b1a1a',
  amber: '#c9a227',
  greenBright: '#7ec850',
};

const stencil = (_ctx: CanvasRenderingContext2D, size: number) =>
  `bold ${Math.round(size)}px "Stencil", "Impact", "Arial Black", sans-serif`;
const typew = (_ctx: CanvasRenderingContext2D, size: number) =>
  `${Math.round(size)}px "Courier New", monospace`;

const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};

// Рисуется с центром в (0,0); transform уже применён вызывающим кодом.
export const drawShelterDoor = (
  ctx: CanvasRenderingContext2D,
  size: number,
  hovered: boolean,
  hasLockedRooms: boolean
) => {
  const s = size;
  const half = s / 2;
  const now = performance.now() / 1000;

  // Мерцание лампы: ярче и быстрее при наведении.
  const base = 0.55 + 0.45 * Math.abs(Math.sin(now * 6) * Math.sin(now * 2.7));
  const flicker = hovered ? 0.75 + 0.25 * base : 0.5 + 0.35 * base;

  ctx.save();

  // Ржавая панель.
  const grad = ctx.createLinearGradient(-half, -half, half, half);
  grad.addColorStop(0, C.rustLight);
  grad.addColorStop(0.5, C.rust);
  grad.addColorStop(1, C.rustDark);
  ctx.fillStyle = grad;
  rr(ctx, -half, -half, s, s, s * 0.14);
  ctx.fill();
  ctx.strokeStyle = hovered ? C.amber : '#2a1c10';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Полосы ржавчины (горизонтальные потёки).
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = C.rustDark;
  ctx.fillRect(-half + s * 0.08, -half + s * 0.22, s * 0.84, s * 0.05);
  ctx.fillRect(-half + s * 0.08, -half + s * 0.62, s * 0.84, s * 0.04);
  ctx.globalAlpha = 1;

  // Царапины.
  ctx.strokeStyle = 'rgba(255, 240, 200, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-half + s * 0.15, -half + s * 0.4);
  ctx.lineTo(-half + s * 0.35, -half + s * 0.5);
  ctx.moveTo(half - s * 0.3, -half + s * 0.3);
  ctx.lineTo(half - s * 0.15, -half + s * 0.42);
  ctx.stroke();

  // Следы крови.
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = C.blood;
  ctx.beginPath();
  ctx.arc(half - s * 0.22, -half + s * 0.68, s * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(-half + s * 0.22, half - s * 0.16, s * 0.16, s * 0.06, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Болты по углам.
  const boltR = s * 0.055;
  const bolts: [number, number][] = [
    [-half + s * 0.14, -half + s * 0.14],
    [half - s * 0.14, -half + s * 0.14],
    [-half + s * 0.14, half - s * 0.14],
    [half - s * 0.14, half - s * 0.14],
  ];
  bolts.forEach(([bx, by]) => {
    ctx.fillStyle = '#1c130b';
    ctx.beginPath();
    ctx.arc(bx, by, boltR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Иллюминатор с мерцающим светом.
  const px = 0;
  const py = -half + s * 0.34;
  const pr = s * 0.2;
  ctx.fillStyle = '#0d0a06';
  ctx.beginPath();
  ctx.arc(px, py, pr + s * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1c130b';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Свет внутри.
  const lightR = pr - s * 0.04;
  ctx.fillStyle = `rgba(201, 162, 39, ${0.25 + flicker * 0.5})`;
  ctx.beginPath();
  ctx.arc(px, py, lightR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255, 220, 120, ${0.3 + flicker * 0.5})`;
  ctx.beginPath();
  ctx.arc(px - lightR * 0.25, py - lightR * 0.25, lightR * 0.45, 0, Math.PI * 2);
  ctx.fill();

  // Табличка «УБЕЖИЩЕ».
  const plateW = s * 0.72;
  const plateH = s * 0.2;
  const plateY = py + pr + s * 0.1;
  ctx.fillStyle = '#241a0e';
  rr(ctx, -plateW / 2, plateY - plateH / 2, plateW, plateH, 2);
  ctx.fill();
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = hovered ? '#ffd34d' : '#c9a227';
  ctx.font = stencil(ctx, s * 0.1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('УБЕЖИЩЕ', 0, plateY + 1);

  // Статус.
  const statusY = half - s * 0.14;
  ctx.font = typew(ctx, s * 0.1);
  ctx.fillStyle = C.greenBright;
  ctx.textAlign = 'center';
  ctx.fillText('ОТКРЫТО', 0, statusY);

  // Бейдж-замок, если есть ещё закрытые комнаты.
  if (hasLockedRooms) {
    const badgeR = s * 0.16;
    const bx = half - badgeR;
    const by = -half + badgeR;
    ctx.fillStyle = C.blood;
    ctx.beginPath();
    ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(s * 0.16)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔒', bx, by + 1);
  }

  ctx.restore();
};
