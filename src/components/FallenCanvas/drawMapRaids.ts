import type { ButtonPosition, MapRaid } from './canvasTypes';

export const drawMapRaids = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  raids: MapRaid[],
  hoveredX: number,
  hoveredY: number,
  buttons: ButtonPosition[],
  mapImage: HTMLImageElement | null = null,
  message: string = ''
) => {
  // Фон карты
  ctx.fillStyle = 'rgba(10, 15, 20, 0.9)';
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 0);
  ctx.fill();

  // Рисуем изображение карты если есть
  if (mapImage instanceof HTMLImageElement && mapImage.complete && mapImage.naturalWidth > 0) {
    ctx.drawImage(mapImage, 0, 0, width, height);
  } else {
    // Если нет изображения — рисуем тёмный фон с сеткой
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, 0, width, height);

    // Сетка
    ctx.strokeStyle = 'rgba(100, 150, 100, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Заголовок
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🗺️ КАРТА РАЙОНОВ', width / 2, 75);
  }

  // Кнопка назад (ниже верхней панели, высота которой 55)
  const backBtnX = 20;
  const backBtnY = 65;
  const isBackHovered = hoveredX > backBtnX && hoveredX < backBtnX + 100 && hoveredY > backBtnY && hoveredY < backBtnY + 40;

  ctx.fillStyle = isBackHovered ? 'rgba(255, 100, 100, 0.8)' : 'rgba(200, 50, 50, 0.6)';
  ctx.beginPath();
  ctx.roundRect(backBtnX, backBtnY, 100, 40, 10);
  ctx.fill();

  ctx.strokeStyle = '#ff6666';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(backBtnX, backBtnY, 100, 40, 10);
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('← Назад', backBtnX + 50, backBtnY + 20);

  buttons.push({ x: backBtnX, y: backBtnY, width: 100, height: 40, id: 'back_to_main' });

  // Рисуем отметки рейдов
  const now = Date.now();
  let runningCount = 0;
  let readyCount = 0;

  const formatRaidTime = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  raids.forEach((raid) => {
    const x = (raid.x / 100) * width;
    const y = (raid.y / 100) * height;
    const radius = raid.type === 'red' ? 25 : 20;

    const isHovered = hoveredX > x - radius && hoveredX < x + radius && hoveredY > y - radius && hoveredY < y + radius;

    // Рейд идёт и время уже вышло — награда ждёт получения
    const ready = !raid.completed && raid.isRunning && !!raid.endTime && now >= raid.endTime;
    if (ready) readyCount++;
    else if (raid.isRunning) runningCount++;

    // Цвет в зависимости от статуса
    let color: string;
    if (ready) {
      color = '#00ff88';
    } else if (raid.completed) {
      color = '#00cc66';
    } else if (raid.isRunning) {
      color = '#ffaa00';
    } else {
      color = raid.type === 'red' ? '#ff4444' : '#ffaa00';
    }

    // Свечение
    ctx.shadowColor = color;
    ctx.shadowBlur = isHovered ? 25 : 15;

    // Круг
    ctx.fillStyle = isHovered ? `${color}cc` : `${color}88`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Обводка
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Иконка внутри круга
    ctx.fillStyle = '#fff';
    ctx.font = `${raid.type === 'red' ? 24 : 20}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icon = ready ? '💰' : raid.completed ? '✅' : raid.isRunning ? '⏳' : '⚠️';
    ctx.fillText(icon, x, y);

    ctx.shadowBlur = 0;

    // Подпись
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(raid.name, x, y + radius + 15);

    // Статус: обратный отсчёт, «Готово» или длительность
    let statusText: string;
    let statusColor: string;
    if (ready) {
      statusText = 'Готово! Забрать';
      statusColor = '#00ff88';
    } else if (raid.isRunning && raid.endTime) {
      statusText = formatRaidTime(raid.endTime - now);
      statusColor = '#ffaa00';
    } else if (raid.completed) {
      statusText = 'Завершён';
      statusColor = '#00cc66';
    } else {
      statusText = raid.type === 'red' ? '30 мин' : '15 мин';
      statusColor = '#aaa';
    }
    ctx.fillStyle = statusColor;
    ctx.font = '10px Arial';
    ctx.fillText(statusText, x, y + radius + 28);

    // Затраты энергии рядом с иконкой (только для рейда, который ещё не запущен)
    if (!raid.completed && !raid.isRunning) {
      const energyText = String(raid.energyCost ?? (raid.type === 'red' ? 20 : 15));
      ctx.font = 'bold 10px Arial';
      const badgeW = ctx.measureText(energyText).width + 26; // место под ⚡ и паддинги
      const badgeH = 16;
      const badgeX = x + radius - 4;  // правый верхний край кружка рейда
      const badgeY = y - radius - 6;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
      ctx.fill();
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Молния
      ctx.fillStyle = '#ffaa00';
      ctx.font = '9px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', badgeX + 4, badgeY + badgeH / 2 + 1);

      // Число
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Arial';
      ctx.fillText(energyText, badgeX + 15, badgeY + badgeH / 2 + 1);
    }

    buttons.push({ x: x - radius, y: y - radius, width: radius * 2, height: radius * 2, id: `raid_${raid.id}` });
  });

  // Счётчик активных рейдов под верхней панелью справа
  if (runningCount > 0 || readyCount > 0) {
    const parts: string[] = [];
    if (runningCount > 0) parts.push(`⏳ идут: ${runningCount}`);
    if (readyCount > 0) parts.push(`💰 готовы: ${readyCount}`);
    const text = parts.join('   ');

    ctx.font = 'bold 12px Arial';
    const textWidth = ctx.measureText(text).width;
    const boxW = textWidth + 24;
    const boxH = 28;
    const boxX = width - boxW - 20;
    const boxY = 65;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();
    ctx.strokeStyle = readyCount > 0 ? '#00ff88' : '#ffaa00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, boxX + boxW / 2, boxY + boxH / 2 + 1);
  }


  // Плашка с последним сообщением (например, почему рейд не запустился)
  if (message) {
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textWidth = ctx.measureText(message).width;
    const boxW = Math.min(width - 40, textWidth + 40);
    const boxH = 34;
    const boxX = (width - boxW) / 2;
    const boxY = height - boxH - 16;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 10);
    ctx.fill();
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 10);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.fillText(message, width / 2, boxY + boxH / 2 + 1);
  }
};
