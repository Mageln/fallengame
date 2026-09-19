import { Task } from './types';
import { getButtonPositions, isPointInRect, roundRect } from './utils';

export const drawTasks = (
  ctx: CanvasRenderingContext2D,
  tasks: Task[],
  canvasWidth: number,
  canvasHeight: number,
  hoveredX: number,
  hoveredY: number
) => {
  const buttonPositions = getButtonPositions(tasks, canvasWidth, canvasHeight);

  tasks.forEach((task, index) => {
    const pos = buttonPositions[index];
    const isHovered = isPointInRect(hoveredX, hoveredY, pos);

    ctx.fillStyle = isHovered ? "rgba(60, 60, 60, 0.9)" : "rgba(30, 30, 30, 0.85)";
    ctx.shadowColor = isHovered ? "#ffd700" : "transparent";
    ctx.shadowBlur = isHovered ? 15 : 0;

    const radius = 8;
    ctx.beginPath();
    roundRect(ctx, pos.x, pos.y, pos.width, pos.height, radius);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = isHovered ? "#ffd700" : "#555";
    ctx.lineWidth = 2;
    ctx.beginPath();
    roundRect(ctx, pos.x, pos.y, pos.width, pos.height, radius);
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "22px Arial";
    ctx.textAlign = "center";
    ctx.fillText(task.icon, pos.x + pos.width / 2, pos.y + 28);

    ctx.fillStyle = "#ddd";
    ctx.font = "9px Arial";
    ctx.fillText(task.name.substring(0, 8), pos.x + pos.width / 2, pos.y + 46);

    ctx.fillStyle = "#ffd700";
    ctx.font = "8px Arial";
    ctx.fillText(`⚡${task.cost}`, pos.x + pos.width / 2, pos.y + 57);
  });

  return buttonPositions;
};