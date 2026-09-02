// src/hooks/useIcon.ts

import { useEffect, useState } from "react";

export interface GameIcons {
  energy: HTMLImageElement | null;
  spicki: HTMLImageElement | null;
  bullets: HTMLImageElement | null;
  zhetons: HTMLImageElement | null;
  gold: HTMLImageElement | null;
  plus: HTMLImageElement | null;
}

export const useIcon = () => {
  const [icons, setIcons] = useState<GameIcons>({
    energy: null,
    spicki: null,
    bullets: null,
    zhetons: null,
    gold: null,
    plus: null,
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadIcon = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; 
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load: ${src}`));
        img.src = src;
      });
    };

    const loadAllIcons = async () => {
      try {
     
        const [energy, spicki, bullets, zhetons, gold, plus] = await Promise.all([
          loadIcon('/public/icon/energy.png'),
          loadIcon('/public/icon/spicki.png'),
          loadIcon('/public/icon/bullets.png'),
          loadIcon('/public/icon/zheton.png'),
          loadIcon('/public/icon/gold.png'),
          loadIcon('/public/icon/plus.png'), 
        ]);

        setIcons({
          energy,
          spicki,
          bullets,
          zhetons,
          gold,
          plus, 
        });
        setIsLoading(false);
      } catch (error) {
        console.log('Error loading icons:', error);
        setIsLoading(false);
      }
    };
    loadAllIcons();
  }, []);

  return { icons, isLoading };
};