import { LOCATIONS } from '../../game/constants';

export const getRoomName = (id: string): string =>
  LOCATIONS.find((room) => room.id === id)?.name ?? id;

// Подбор размера шрифта, чтобы текст влез в заданную ширину
export const fitFont = (
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
export const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
