import React, { useState, useEffect } from "react";
import styles from "../../style/PrisonCanvas/PrisonCanvas.module.scss";
import { PrisonCanvasProps } from "./types";
import { useCanvas } from "./useCanvas";
import { useIcon } from "../../hooks/useIcon";

export const FallenCanvas: React.FC<PrisonCanvasProps> = ({
  onTaskComplete,
  onResourceClick,
  energy,
  maxEnergy,
  authority,
  spicki = 0,
  bullets = 0,
}) => {
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [characterImage, setCharacterImage] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем иконки
  const { icons, isLoading: iconsLoading } = useIcon();

  // Загрузка фонового изображения
  useEffect(() => {
    const image = new Image();
    image.src = "/public/background.jpg";
    image.crossOrigin = "anonymous";
    image.onload = () => {
      setBackgroundImage(image);
      setIsLoading(false);
    };
    image.onerror = () => {
      setBackgroundImage(null);
      setIsLoading(false);
    };
  }, []);

  // Загрузка персонажа
  useEffect(() => {
    const image = new Image();
    image.src = "/public/pers1.png";
    image.crossOrigin = "anonymous";
    image.onload = () => setCharacterImage(image);
    image.onerror = () => setCharacterImage(null);
  }, []);

  const { canvasRef, handleCanvasClick, handleMouseMove } = useCanvas(
    backgroundImage,
    characterImage,
    icons,
    energy,
    maxEnergy,
    authority,
    spicki,
    bullets,
    0,
    0,
    onResourceClick,
    onTaskComplete
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
        onMouseLeave={() => {}}
      />
    </div>
  );
};

export * from "./types";
export * from "./tasks";