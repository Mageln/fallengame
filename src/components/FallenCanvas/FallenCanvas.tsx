import React, { useState, useEffect, useCallback } from "react";
import styles from "../../style/PrisonCanvas/PrisonCanvas.module.scss";
import { PrisonCanvasProps } from "./types";
import { useCanvas } from "./useCanvas";
import { useIcon } from "../../hooks/useIcon";
import { APPEARANCES } from "../../game/constants";
import { TASKS } from "./tasks";

const loadImg = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img); // resolve even on error so we don't hang
    img.src = src;
  });
};

export const FallenCanvas: React.FC<PrisonCanvasProps> = ({
  onTaskComplete,
  onResourceClick,
  onZombieClick,
  energy,
  maxEnergy,
  authority,
  spicki = 0,
  bullets = 0,
  gold = 0,
  zhetons = 0,
  zombieHealth = 100,
  maxZombieHealth = 100,
  isZombieAlive = true,
  appearance = 0,
  tasks,
}) => {
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [characterImage, setCharacterImage] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { icons, isLoading: iconsLoading } = useIcon();
  const appearanceColor = APPEARANCES.find((item) => item.id === appearance)?.color ?? '#d4a574';
  const canvasTasks = tasks ?? TASKS;

  useEffect(() => {
    let cancelled = false;
    
    Promise.all([
      loadImg('/background.jpg'),
      loadImg('/pers1.png'),
    ]).then(([bg, char]) => {
      if (cancelled) return;
      setBackgroundImage(bg);
      setCharacterImage(char);
      setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  const handleTaskComplete = useCallback((id: string) => {
    if (onTaskComplete) onTaskComplete(id);
  }, [onTaskComplete]);

  const handleResourceClick = useCallback((id: string) => {
    if (onResourceClick) onResourceClick(id);
  }, [onResourceClick]);

  const handleZombieClick = useCallback(() => {
    if (onZombieClick) onZombieClick();
  }, [onZombieClick]);

  const { canvasRef, handleCanvasClick, handleMouseMove } = useCanvas(
    backgroundImage,
    characterImage,
    icons,
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
    handleResourceClick,
    handleTaskComplete,
    handleZombieClick,
    canvasTasks,
    appearanceColor
  );

  return (
    <div className={styles.canvasWrapper}>
      {(isLoading || iconsLoading) && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loader} />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => undefined}
      />
    </div>
  );
};

export * from "./types";
export * from "./tasks";
