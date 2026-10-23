// Отрисовка фона главного экрана + атмосферные эффекты (виньетка, шум, кроссфейд).

// Тайл шума генерируется один раз и повторяется паттерном — дешевле, чем
// перебирать пиксели на каждом кадре.
let _noiseTile: HTMLCanvasElement | null = null;
const getNoiseTile = (): HTMLCanvasElement => {
  if (_noiseTile) return _noiseTile;
  const size = 128;
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const cx = tile.getContext('2d');
  if (cx) {
    const img = cx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = Math.floor(Math.random() * 16);
    }
    cx.putImageData(img, 0, 0);
  }
  _noiseTile = tile;
  return tile;
};

const drawFallback = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  // Постапокалиптический «разрушенный город».
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1a0a0a');
  gradient.addColorStop(0.5, '#2d1515');
  gradient.addColorStop(1, '#0d0d0d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#1a1515';
  ctx.fillRect(50, 200, 80, 200);
  ctx.fillRect(70, 150, 40, 50);
  ctx.fillRect(700, 250, 100, 150);
  ctx.fillRect(730, 200, 40, 50);

  ctx.fillStyle = '#2a2020';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(60 + i * 25, 220, 15, 20);
    ctx.fillRect(710 + i * 25, 270, 15, 20);
  }

  ctx.fillStyle = 'rgba(200, 200, 180, 0.3)';
  ctx.beginPath();
  ctx.arc(800, 60, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(200, 200, 180, 0.1)';
  ctx.beginPath();
  ctx.arc(810, 50, 50, 0, Math.PI * 2);
  ctx.fill();
};

// Рисует картинку с сохранением пропорций (cover) на весь канвас.
const drawCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, width: number, height: number) => {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = width / height;
  let dw = width;
  let dh = height;
  if (imgRatio > boxRatio) {
    dw = height * imgRatio;
  } else {
    dh = width / imgRatio;
  }
  ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
};

export const drawBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundImage: HTMLImageElement | null,
  prevBackgroundImage: HTMLImageElement | null = null,
  transition: number = 1
) => {
  const hasCurrent = backgroundImage && backgroundImage.complete && backgroundImage.naturalWidth > 0;
  const hasPrev = prevBackgroundImage && prevBackgroundImage.complete && prevBackgroundImage.naturalWidth > 0;

  if (!hasCurrent) {
    if (hasPrev) drawCover(ctx, prevBackgroundImage!, width, height);
    else drawFallback(ctx, width, height);
  } else if (hasPrev && transition < 1) {
    // Кроссфейд: старый фон полностью, новый — поверх с нарастающей прозрачностью.
    drawCover(ctx, prevBackgroundImage!, width, height);
    ctx.globalAlpha = Math.max(0, Math.min(1, transition));
    drawCover(ctx, backgroundImage!, width, height);
    ctx.globalAlpha = 1;
  } else {
    drawCover(ctx, backgroundImage!, width, height);
  }

  // Лёгкая виньетка.
  const cx = width / 2;
  const cy = height / 2;
  const innerR = Math.min(width, height) * 0.42;
  const outerR = Math.hypot(width, height) * 0.62;
  const vig = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  // Плёночный шум.
  const pattern = ctx.createPattern(getNoiseTile(), 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
  }
};
