export const drawBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundImage: HTMLImageElement | null
) => {
  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, width, height);
  } else {
    // Постапокалиптический фон
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#1a0a0a");
    gradient.addColorStop(0.5, "#2d1515");
    gradient.addColorStop(1, "#0d0d0d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Разрушенные здания (силуэты)
    ctx.fillStyle = "#1a1515";
    ctx.fillRect(50, 200, 80, 200);
    ctx.fillRect(70, 150, 40, 50);
    ctx.fillRect(700, 250, 100, 150);
    ctx.fillRect(730, 200, 40, 50);

    // Окна
    ctx.fillStyle = "#2a2020";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(60 + i * 25, 220, 15, 20);
      ctx.fillRect(710 + i * 25, 270, 15, 20);
    }

    // Луна
    ctx.fillStyle = "rgba(200, 200, 180, 0.3)";
    ctx.beginPath();
    ctx.arc(800, 60, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(200, 200, 180, 0.1)";
    ctx.beginPath();
    ctx.arc(810, 50, 50, 0, Math.PI * 2);
    ctx.fill();
  }
};