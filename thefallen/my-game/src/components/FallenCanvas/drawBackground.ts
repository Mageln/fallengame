export const drawBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundImage: HTMLImageElement | null
) => {
  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, width, height);
  } else {
    // Стандартный фон с кирпичами
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#1a1a1a");
    gradient.addColorStop(1, "#0d0d0d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Кирпичи
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 1;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 12; col++) {
        const x = col * 60 + (row % 2) * 30;
        const y = row * 30 + 40;
        ctx.strokeRect(x, y, 60, 30);
      }
    }
  }
};