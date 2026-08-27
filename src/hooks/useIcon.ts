// src/hooks/useIcon.ts

import { useEffect, useState } from "react";

export interface GameIcons {
  energy: HTMLImageElement | null;
  spicki: HTMLImageElement | null;
  bullets: HTMLImageElement | null;
  zhetons: HTMLImageElement | null;
  gold: HTMLImageElement | null;
  plus: HTMLImageElement | null;
  zombie: HTMLImageElement | null;
}

const loadIconWithTimeout = (src: string, timeout = 3000): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed: ${src}`));
    setTimeout(() => reject(new Error(`Timeout: ${src}`)), timeout);
    img.src = src;
  });
};

export const useIcon = () => {
  const [icons, setIcons] = useState<GameIcons>({
    energy: null,
    spicki: null,
    bullets: null,
    zhetons: null,
    gold: null,
    plus: null,
    zombie: null,
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAllIcons = async () => {
      const results = await Promise.allSettled([
        loadIconWithTimeout('/icon/energy.png', 2000),
        loadIconWithTimeout('/icon/spicki.png', 2000),
        loadIconWithTimeout('/icon/bullets.png', 2000),
        loadIconWithTimeout('/icon/zheton.png', 2000),
        loadIconWithTimeout('/icon/gold.png', 2000),
        loadIconWithTimeout('/icon/plus.png', 2000),
        loadIconWithTimeout('/icon/zombie.png', 2000),
      ]);

      setIcons({
        energy: results[0]?.status === 'fulfilled' ? (results[0] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        spicki: results[1]?.status === 'fulfilled' ? (results[1] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        bullets: results[2]?.status === 'fulfilled' ? (results[2] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        zhetons: results[3]?.status === 'fulfilled' ? (results[3] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        gold: results[4]?.status === 'fulfilled' ? (results[4] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        plus: results[5]?.status === 'fulfilled' ? (results[5] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        zombie: results[6]?.status === 'fulfilled' ? (results[6] as PromiseFulfilledResult<HTMLImageElement>).value : null,
      });
      setIsLoading(false);
    };
    loadAllIcons();
  }, []);

  return { icons, isLoading };
};