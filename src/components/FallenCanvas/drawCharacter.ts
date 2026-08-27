import { Position } from './types';

export const drawCharacter = (
  ctx: CanvasRenderingContext2D,
  position: Position,
  characterImage: HTMLImageElement | null,
  appearanceColor = '#d4a574'
) => {
  if (characterImage) {
    ctx.drawImage(
      characterImage,
      position.x,
      position.y,
      position.width,
      position.height
    );
    ctx.fillStyle = appearanceColor;
    ctx.globalAlpha = 0.18;
    ctx.fillRect(position.x, position.y, position.width, position.height);
    ctx.globalAlpha = 1;
  } else {
    const centerX = position.x + position.width / 2;
    const centerY = position.y + 50;

    // Тело с полосками
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(centerX - 25, centerY + 20, 50, 60);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#3a3a3a" : "#2a2a2a";
      ctx.fillRect(centerX - 25, centerY + 20 + i * 15, 50, 15);
    }

    // Голова
    ctx.fillStyle = appearanceColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY - 10, 25, 0, Math.PI * 2);
    ctx.fill();

    // Глаза
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(centerX - 10, centerY - 12, 6, 0, Math.PI * 2);
    ctx.arc(centerX + 10, centerY - 12, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(centerX - 12, centerY - 12, 3, 0, Math.PI * 2);
    ctx.arc(centerX + 8, centerY - 12, 3, 0, Math.PI * 2);
    ctx.fill();
  }
};

export const CHARACTER_POSITION: Position = {
  x: 210,
  y: 150,
  width: 410,
  height: 540,
};