// src/components/PrisonCanvas/utils.ts

import { Task } from './types';

/**
 * Вычисляет позицию кнопок для центрирования внизу экрана
 */
export const getButtonPositions = (
  tasks: Task[],
  canvasWidth: number,
  canvasHeight: number
) => {
  const buttonY = canvasHeight - 80;
  const buttonWidth = 85;
  const spacing = 10;
  const totalWidth = tasks.length * buttonWidth + (tasks.length - 1) * spacing;
  const startX = (canvasWidth - totalWidth) / 2;

  return tasks.map((_, index) => ({
    x: startX + index * (buttonWidth + spacing),
    y: buttonY,
    width: buttonWidth,
    height: 60,
  }));
};

/**
 * Проверяет, находится ли точка внутри прямоугольника
 */
export const isPointInRect = (
  px: number,
  py: number,
  rect: { x: number; y: number; width: number; height: number }
) => {
  return px > rect.x && px < rect.x + rect.width &&
         py > rect.y && py < rect.y + rect.height;
};

/**
 * Создает скругленный прямоугольник для Canvas
 */
export const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radii: number | number[]
) => {
  const r = typeof radii === 'number' ? radii : (radii[0] || 0);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  return ctx;
};

// Полифилл для roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (
    x: number,
    y: number,
    w: number,
    h: number,
    radii: number | number[]
  ) {
    const r = typeof radii === 'number' ? radii : (radii[0] || 0);
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    return this;
  };
}