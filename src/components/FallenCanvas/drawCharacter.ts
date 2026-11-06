import { Position } from './types';
import { getVisibleBounds, type IconBounds } from './iconBounds';

// Центрируем видимую фигуру и ставим её над нижней панелью на любом экране.
export const getCharacterPosition = (width: number, height: number, aspect = 402 / 600): Position => {
  const w = Number.isFinite(width) ? Math.max(0, width) : 0;
  const h = Number.isFinite(height) ? Math.max(0, height) : 0;
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 402 / 600;
  const top = Math.min(65, h * 0.15);
  const bottom = h - Math.min(86, h * 0.2);
  const characterHeight = Math.min(540, Math.max(0, bottom - top) * 0.9, (w * 0.65) / ratio);
  const characterWidth = characterHeight * ratio;
  return { x: (w - characterWidth) / 2, y: bottom - characterHeight, width: characterWidth, height: characterHeight };
};

// Координаты кепки заданы в пропорциях оригинального pers1.png (402×600).
// Преобразуем их через те же видимые границы, что и при отрисовке персонажа.
export const getCapPosition = (position: Position, visible: IconBounds, imageWidth: number, imageHeight: number, capWidth: number, capHeight: number): Position => ({
  x: position.x + (imageWidth * (145 / 402) - visible.x) / visible.w * position.width,
  y: position.y + (imageHeight * (23 / 600) - visible.y) / visible.h * position.height,
  width: imageWidth * (74 / 402) / visible.w * position.width,
  height: imageWidth * (74 / 402) * capHeight / capWidth / visible.h * position.height,
});

export const drawCharacter = (
  ctx: CanvasRenderingContext2D,
  position: Position,
  characterImage: HTMLImageElement | null,
  appearanceColor = '#d4a574',
  capImage: HTMLImageElement | null = null
) => {
  if (characterImage && characterImage.complete && characterImage.naturalWidth > 0 && characterImage.naturalHeight > 0) {
    const visible = getVisibleBounds(characterImage);
    ctx.drawImage(
      characterImage,
      visible.x, visible.y, visible.w, visible.h,
      position.x,
      position.y,
      position.width,
      position.height
    );
    if (capImage?.complete && capImage.naturalWidth > 0 && capImage.naturalHeight > 0) {
      const cap = getCapPosition(position, visible, characterImage.naturalWidth, characterImage.naturalHeight, capImage.naturalWidth, capImage.naturalHeight);
      ctx.drawImage(capImage, cap.x, cap.y, cap.width, cap.height);
    }
  } else {
    // Запасной силуэт занимает тот же прямоугольник, что и спрайт.
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.scale(position.width / 100, position.height / 160);
    ctx.fillStyle = appearanceColor;
    ctx.beginPath();
    ctx.arc(50, 20, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(25, 38, 50, 70);
    ctx.fillRect(25, 108, 20, 52);
    ctx.fillRect(55, 108, 20, 52);
    ctx.restore();
    if (capImage?.complete && capImage.naturalWidth > 0 && capImage.naturalHeight > 0) {
      ctx.drawImage(capImage, position.x + position.width * 0.32, position.y, position.width * 0.36, position.width * 0.36 * capImage.naturalHeight / capImage.naturalWidth);
    }
  }
};
