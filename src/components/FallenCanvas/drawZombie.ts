export const drawZombie = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  health: number,
  maxHealth: number,
  isAlive: boolean,
  zombieImage: HTMLImageElement | null,
  width: number = 80,
  height: number = 120
) => {
  if (!isAlive) {
    // Если зомби мертв, рисуем могилу
    ctx.fillStyle = "#3d2817";
    ctx.fillRect(x + 20, y + 80, 40, 10);
    ctx.fillRect(x + 35, y + 60, 10, 20);
    ctx.fillStyle = "#2a1a0a";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("💀", x + 40, y + 55);
    return;
  }

  if (zombieImage) {
    ctx.drawImage(zombieImage, x, y, width, height);
  } else {
    // Рисуем зомби примитивами
    // Тело (зеленое)
    ctx.fillStyle = "#2d5a27";
    ctx.fillRect(x + 20, y + 40, 40, 60);

    // Голова
    ctx.fillStyle = "#3d7a37";
    ctx.beginPath();
    ctx.arc(x + 40, y + 25, 25, 0, Math.PI * 2);
    ctx.fill();

    // Глаза (красные)
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    ctx.arc(x + 32, y + 22, 5, 0, Math.PI * 2);
    ctx.arc(x + 48, y + 22, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(x + 30, y + 22, 2, 0, Math.PI * 2);
    ctx.arc(x + 46, y + 22, 2, 0, Math.PI * 2);
    ctx.fill();

    // Рот с зубами
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x + 30, y + 35, 20, 8);
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + 32 + i * 5, y + 35, 3, 6);
    }

    // Руки (вытянутые вперед)
    ctx.fillStyle = "#2d5a27";
    ctx.fillRect(x, y + 50, 20, 10);
    ctx.fillRect(x + 60, y + 50, 20, 10);

    // Ноги
    ctx.fillRect(x + 25, y + 100, 10, 20);
    ctx.fillRect(x + 45, y + 100, 10, 20);
  }

  // HP Бар над зомби
  const barWidth = 60;
  const barHeight = 6;
  const barX = x + (width - barWidth) / 2;
  const barY = y - 12;

  // Фон HP бара
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // Заполнение HP
  const healthPercent = Math.max(0, (health / maxHealth) * barWidth);
  const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
  gradient.addColorStop(0, "#ff0000");
  gradient.addColorStop(0.5, "#ff6600");
  gradient.addColorStop(1, "#00ff00");
  ctx.fillStyle = gradient;
  ctx.fillRect(barX, barY, healthPercent, barHeight);

  // Текст HP
  ctx.fillStyle = "#fff";
  ctx.font = "8px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.ceil(health)}/${maxHealth}`, x + width / 2, barY - 2);
};