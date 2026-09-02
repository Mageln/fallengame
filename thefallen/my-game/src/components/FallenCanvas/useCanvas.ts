// src/components/FallenCanvas/useCanvas.ts

import { useRef, useEffect, useState, useCallback } from 'react';
import { ButtonPosition, CANVAS_CONFIG, GameIcons } from './types';
import { drawBackground } from './drawBackground';
import { drawCharacter, CHARACTER_POSITION } from './drawCharacter';
import { drawTasks } from './drawTasks';
import { drawResources } from './drawResources';
import { TASK_COSTS, TASKS } from './tasks';
import { isPointInRect, getButtonPositions } from './utils';

export const useCanvas = (
  backgroundImage: HTMLImageElement | null,
  characterImage: HTMLImageElement | null,
  icons: GameIcons,
  energy: number,
  maxEnergy: number,
  authority: number,
  spicki: number,
  bullets: number,
  gold: number = 0,
  zhetons: number = 0,
  onResourceClick?: (id: string) => void,
  onTaskComplete?: (id: string) => void
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredX, setHoveredX] = useState(0);
  const [hoveredY, setHoveredY] = useState(0);
  const [buttonPositions, setButtonPositions] = useState<ButtonPosition[]>([]);
  
  // Флаг для отслеживания необходимости перерисовки
  const [needsRender, setNeedsRender] = useState(true);
  
  // Сохраняем последние данные для рендеринга
  const lastDataRef = useRef({
    energy,
    maxEnergy,
    authority,
    spicki,
    bullets,
    gold,
    zhetons,
    hoveredX,
    hoveredY,
  });

  // Функция отрисовки
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { WIDTH, HEIGHT } = CANVAS_CONFIG;
    
    // Устанавливаем размеры только если они изменились
    if (canvas.width !== WIDTH || canvas.height !== HEIGHT) {
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
    }

    // Отрисовка всех элементов
    drawBackground(ctx, WIDTH, HEIGHT, backgroundImage);
    drawCharacter(ctx, CHARACTER_POSITION, characterImage);
    drawTasks(ctx, TASKS, WIDTH, HEIGHT, hoveredX, hoveredY);

    // Отрисовка ресурсов и получение позиций кнопок
    const positions = drawResources(
      ctx,
      WIDTH,
      energy,
      maxEnergy,
      icons,
      spicki,
      bullets,
      gold,
      zhetons
    );
    
    if (positions) {
      setButtonPositions(positions);
    }

    setNeedsRender(false);
  }, [backgroundImage, characterImage, icons]);

  // Первоначальная отрисовка
  useEffect(() => {
    render();
  }, [render]);

  // Отрисовка только при изменении данных (но не при каждом рендере)
  useEffect(() => {
    const data = { energy, maxEnergy, authority, spicki, bullets, gold, zhetons, hoveredX, hoveredY };
    const lastData = lastDataRef.current;
    
    // Проверяем, изменились ли данные
    const hasChanged = 
      data.energy !== lastData.energy ||
      data.maxEnergy !== lastData.maxEnergy ||
      data.authority !== lastData.authority ||
      data.spicki !== lastData.spicki ||
      data.bullets !== lastData.bullets ||
      data.gold !== lastData.gold ||
      data.zhetons !== lastData.zhetons ||
      data.hoveredX !== lastData.hoveredX ||
      data.hoveredY !== lastData.hoveredY;

    if (hasChanged && !needsRender) {
      lastDataRef.current = data;
      render();
    } else {
      lastDataRef.current = data;
    }
  }, [energy, maxEnergy, authority, spicki, bullets, gold, zhetons, hoveredX, hoveredY, render, needsRender]);

  // Обработчик клика по Canvas
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Проверяем клики по кнопкам ресурсов
    for (const btn of buttonPositions) {
      const isHover = x > btn.x && x < btn.x + btn.width && y > btn.y && y < btn.y + btn.height;
      if (isHover) {
        if (onResourceClick) {
          onResourceClick(btn.id);
          setNeedsRender(true); // Запрашиваем перерисовку
        }
        return;
      }
    }

    // Проверяем клики по кнопкам заданий
    if (onTaskComplete) {
      const taskPositions = getButtonPositions(TASKS, canvas.width, canvas.height);
      TASKS.forEach((task, index) => {
        const pos = taskPositions[index];
        if (isPointInRect(x, y, pos)) {
          const cost = TASK_COSTS[task.id] || 20;
          if (energy >= cost) {
            onTaskComplete(task.id.toString());
            setNeedsRender(true); // Запрашиваем перерисовку
          } else {
            alert("Не хватает энергии!");
          }
        }
      });
    }
  }, [buttonPositions, energy, onResourceClick, onTaskComplete]);

  // Обработчик движения мыши (обновляем hover)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const newX = (e.clientX - rect.left) * scaleX;
    const newY = (e.clientY - rect.top) * scaleY;
    
    // Обновляем hover только если изменился
    if (hoveredX !== newX || hoveredY !== newY) {
      setHoveredX(newX);
      setHoveredY(newY);
    }
  }, [hoveredX, hoveredY]);

  return {
    canvasRef,
    hoveredX,
    hoveredY,
    setHoveredX,
    setHoveredY,
    handleCanvasClick,
    handleMouseMove,
  };
};