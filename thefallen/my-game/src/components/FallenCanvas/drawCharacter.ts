import { Position } from './types';

export const drawCharacter = (
  ctx: CanvasRenderingContext2D,
  position: Position,
  characterImage: HTMLImageElement | null
) => {
  if (characterImage) {
    ctx.drawImage(
      characterImage,
      position.x,
      position.y,
      position.width,
      position.height
    );
  } else {
    // Заглушка если нет картинки
    const centerX = position.x + position.width / 2;
    const centerY = position.y + 50;

    // Голова
    ctx.fillStyle = "#d4a574";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    ctx.fill();

    // Тело
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(centerX - 25, centerY + 20, 50, 60);
  }
};

// Настройки позиции персонажа
export const CHARACTER_POSITION: Position = {
  x: 210,
  y: 150,
  width: 410,
  height: 540,
};