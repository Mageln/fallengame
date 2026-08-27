

import { roundRect } from "./utils";

export interface ButtonPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
}

export const drawResources = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  energy: number,
  maxEnergy: number,
  icons: {
    energy: HTMLImageElement | null;
    spicki: HTMLImageElement | null;
    bullets: HTMLImageElement | null;
    gold: HTMLImageElement | null;
    zhetons: HTMLImageElement | null;
    plus: HTMLImageElement | null;
  },
  spicki: number,
  bullets: number,
  gold: number,
  zhetons: number
): ButtonPosition[] => {
  const panelX = 0;
  const panelY = 0;
  const panelWidth = canvasWidth;
  const panelHeight = 40;

  ctx.fillStyle = "#272727";
  ctx.beginPath();
  roundRect(ctx, panelX, panelY, panelWidth, panelHeight, 0);
  ctx.fill();

  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;
  ctx.beginPath();
  roundRect(ctx, panelX, panelY, panelWidth, panelHeight, 0);
  ctx.stroke();

  const resourceY = panelY + 24;

  const resources: Array<{
    icon: HTMLImageElement | null;
    value: number | string;
    label: string;
    id: string;
  }> = [
    { icon: icons.spicki, value: spicki, label: "Спички", id: "spicki" },
    { icon: icons.bullets, value: bullets, label: "Пули", id: "bullets" },
    { icon: icons.gold, value: gold, label: "Золото", id: "gold" },
    { icon: icons.zhetons, value: zhetons, label: "Жетоны", id: "zhetons" },
    { icon: icons.energy, value: `${energy}/${maxEnergy}`, label: "Энергия", id: "energy" },
  ];

  const resourceSpacing = panelWidth / resources.length;
  const buttonPositions: ButtonPosition[] = [];

  resources.forEach((res, index) => {
    const x = panelX + index * resourceSpacing + resourceSpacing / 2;
    const iconSize = 20;
    const iconX = x - 35;
    const textX = x - 10;
    const buttonX = x + 12;
    const buttonY = resourceY - 9;
    const buttonSize = 18;

    const groupPadding = 4;
    const groupStartX = iconX - groupPadding;
    const groupEndX = buttonX + buttonSize + groupPadding;
    const groupWidth = groupEndX - groupStartX;
    const groupHeight = Math.max(iconSize, buttonSize) + groupPadding * 2;
    const groupY = resourceY - groupHeight / 2;

    // Бордер вокруг группы
    ctx.strokeStyle = "rgba(255, 215, 0, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    roundRect(ctx, groupStartX, groupY, groupWidth, groupHeight, 6);
    ctx.stroke();

    if (res.icon instanceof HTMLImageElement && res.icon.complete && res.icon.naturalWidth > 0) {
      ctx.drawImage(res.icon, iconX, resourceY - iconSize / 2, iconSize, iconSize);
    } else {
      ctx.fillStyle = "#666";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("📦", iconX + iconSize / 2, resourceY);
    }

    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(res.value.toString(), textX, resourceY - 4);

    if (icons.plus instanceof HTMLImageElement && icons.plus.complete && icons.plus.naturalWidth > 0) {
      ctx.drawImage(icons.plus, buttonX, buttonY, buttonSize, buttonSize);
    } else {
      ctx.fillStyle = "rgba(255, 215, 0, 0.15)";
      ctx.beginPath();
      roundRect(ctx, buttonX, buttonY, buttonSize, buttonSize, 4);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 215, 0, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      roundRect(ctx, buttonX, buttonY, buttonSize, buttonSize, 4);
      ctx.stroke();
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", buttonX + buttonSize / 2, buttonY + buttonSize / 2 + 1);
    }

    buttonPositions.push({
      x: buttonX,
      y: buttonY,
      width: buttonSize,
      height: buttonSize,
      id: res.id,
    });
  });

  return buttonPositions;
};