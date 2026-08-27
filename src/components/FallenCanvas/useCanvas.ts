import { useRef, useEffect, useState, useCallback } from 'react';
import { ButtonPosition, CANVAS_CONFIG, GameIcons, Task } from './types';
import { drawBackground } from './drawBackground';
import { drawCharacter, CHARACTER_POSITION } from './drawCharacter';
import { drawTasks } from './drawTasks';
import { drawResources } from './drawResources';
import { drawZombie } from './drawZombie';
import { TASKS } from './tasks';
import { isPointInRect, getButtonPositions } from './utils';
import { spawnParticles, updateParticles, drawParticles } from './particles';

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
  zombieHealth: number = 100,
  maxZombieHealth: number = 100,
  isZombieAlive: boolean = true,
  onResourceClick?: (id: string) => void,
  onTaskComplete?: (id: string) => void,
  onZombieClick?: () => void,
  tasks: Task[] = TASKS,
  appearanceColor = '#d4a574'
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredX, setHoveredX] = useState(0);
  const [hoveredY, setHoveredY] = useState(0);
  const [buttonPositions, setButtonPositions] = useState<ButtonPosition[]>([]);
  const [needsRender, setNeedsRender] = useState(true);

  const lastDataRef = useRef({
    energy,
    maxEnergy,
    authority,
    spicki,
    bullets,
    gold,
    zhetons,
    zombieHealth,
    maxZombieHealth,
    isZombieAlive,
    hoveredX,
    hoveredY,
  });

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { WIDTH, HEIGHT } = CANVAS_CONFIG;
    
    if (canvas.width !== WIDTH || canvas.height !== HEIGHT) {
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
    }

    drawBackground(ctx, WIDTH, HEIGHT, backgroundImage);
    drawCharacter(ctx, CHARACTER_POSITION, characterImage, appearanceColor);
    drawZombie(
      ctx,
      600, 450,
      zombieHealth,
      maxZombieHealth,
      isZombieAlive,
      icons.zombie || null
    );

    drawTasks(ctx, tasks, WIDTH, HEIGHT, hoveredX, hoveredY);

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

    // Particle system
    updateParticles();
    drawParticles(ctx);

    // Information overlay
    if (isZombieAlive) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(540, 400, 200, 30);
      ctx.fillStyle = "#ff4444";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`🧟 Зомби уровня ${Math.floor(zombieHealth / 30) + 1}`, 640, 420);
    } else {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(540, 400, 200, 30);
      ctx.fillStyle = "#ffd700";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.fillText("💀 Зомби повержен! Ожидание...", 640, 420);
    }

    setNeedsRender(false);
  }, [backgroundImage, characterImage, icons, zombieHealth, maxZombieHealth, isZombieAlive, tasks, appearanceColor, hoveredX, hoveredY, energy, maxEnergy, spicki, bullets, gold, zhetons]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const data = { 
      energy, maxEnergy, authority, spicki, bullets, gold, zhetons,
      zombieHealth, maxZombieHealth, isZombieAlive,
      hoveredX, hoveredY 
    };
    const lastData = lastDataRef.current;
    
    const hasChanged = Object.keys(data).some(key => 
      data[key as keyof typeof data] !== lastData[key as keyof typeof data]
    );

    if (hasChanged && !needsRender) {
      lastDataRef.current = data;
      render();
    } else {
      lastDataRef.current = data;
    }
  }, [energy, maxEnergy, authority, spicki, bullets, gold, zhetons, 
      zombieHealth, maxZombieHealth, isZombieAlive,
      hoveredX, hoveredY, render, needsRender]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Проверяем клик по зомби (зона клика 600, 450, 80, 120)
    const zombieX = 600;
    const zombieY = 450;
    const zombieWidth = 80;
    const zombieHeight = 120;
    if (isZombieAlive && 
        x > zombieX && x < zombieX + zombieWidth && 
        y > zombieY && y < zombieY + zombieHeight) {
      if (onZombieClick) {
        onZombieClick();
        // Spawn blood/spark particles at zombie position
        spawnParticles(x, y, 12, '#ff4444', 'blood');
        spawnParticles(x, y, 8, '#888', 'smoke');
        setNeedsRender(true);
      }
      return;
    }

    // Проверяем клики по кнопкам ресурсов
    for (const btn of buttonPositions) {
      const isHover = x > btn.x && x < btn.x + btn.width && y > btn.y && y < btn.y + btn.height;
      if (isHover) {
        if (onResourceClick) {
          onResourceClick(btn.id);
          setNeedsRender(true);
        }
        return;
      }
    }

    // Проверяем клики по кнопкам заданий
    if (onTaskComplete) {
      const taskPositions = getButtonPositions(tasks, canvas.width, canvas.height);
      tasks.forEach((task, index) => {
        const pos = taskPositions[index];
        if (isPointInRect(x, y, pos)) {
          onTaskComplete(String(task.id));
          setNeedsRender(true);
        }
      });
    }
  }, [buttonPositions, isZombieAlive, onResourceClick, onTaskComplete, onZombieClick, tasks]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const newX = (e.clientX - rect.left) * scaleX;
    const newY = (e.clientY - rect.top) * scaleY;
    
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