// src/hooks/useIcon.ts

import { useEffect, useState, useMemo } from "react";

export interface GameIcons {
  energy: HTMLImageElement | null;
  spicki: HTMLImageElement | null;
  bullets: HTMLImageElement | null;
  zhetons: HTMLImageElement | null;
  gold: HTMLImageElement | null;
  plus: HTMLImageElement | null;
  zombie: HTMLImageElement | null;
  // Кнопки нижней панели
  boss: HTMLImageElement | null;
  clans: HTMLImageElement | null;
  arena: HTMLImageElement | null;
  personaz: HTMLImageElement | null;
  kazino: HTMLImageElement | null;
  cloth: HTMLImageElement | null;
  komnata: HTMLImageElement | null;
  raion: HTMLImageElement | null;
}

export interface ButtonIconSrc {
  boss: string | null;
  clans: string | null;
  arena: string | null;
  personaz: string | null;
  kazino: string | null;
  cloth: string | null;
  gold: string | null;
  komnata: string | null;
  raion: string | null;
}

const ICON_SRCS = {
  boss: '/icon/boss.jpg',
  clans: '/icon/clans.jpg',
  arena: '/icon/arena.jpg',
  personaz: '/icon/personaz.jpg',
  kazino: '/icon/kazino.jpg',
  cloth: '/icon/cloth.jpg',
  gold: '/icon/gold.png',
} as const;

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
    // Кнопки нижней панели
    boss: null,
    clans: null,
    arena: null,
    personaz: null,
    kazino: null,
    cloth: null,
    komnata: null,
    raion: null,
  });

  const [iconSrcs, setIconSrcs] = useState<ButtonIconSrc>({
    boss: null,
    clans: null,
    arena: null,
    personaz: null,
    kazino: null,
    cloth: null,
    gold: null,
    komnata: null,
    raion: null,
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
        // Кнопки нижней панели
        loadIconWithTimeout('/icon/boss.jpg', 2000),
        loadIconWithTimeout('/icon/clans.jpg', 2000),
        loadIconWithTimeout('/icon/arena.jpg', 2000),
        loadIconWithTimeout('/icon/personaz.jpg', 2000),
        loadIconWithTimeout('/icon/kazino.jpg', 2000),
        loadIconWithTimeout('/icon/cloth.jpg', 2000),
        loadIconWithTimeout('/icon/komnata.jpg', 2000),
        loadIconWithTimeout('/icon/raion.jpg', 2000),
      ]);

      setIcons({
        energy: results[0]?.status === 'fulfilled' ? (results[0] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        spicki: results[1]?.status === 'fulfilled' ? (results[1] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        bullets: results[2]?.status === 'fulfilled' ? (results[2] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        zhetons: results[3]?.status === 'fulfilled' ? (results[3] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        gold: results[4]?.status === 'fulfilled' ? (results[4] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        plus: results[5]?.status === 'fulfilled' ? (results[5] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        zombie: results[6]?.status === 'fulfilled' ? (results[6] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        // Кнопки нижней панели
        boss: results[7]?.status === 'fulfilled' ? (results[7] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        clans: results[8]?.status === 'fulfilled' ? (results[8] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        arena: results[9]?.status === 'fulfilled' ? (results[9] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        personaz: results[10]?.status === 'fulfilled' ? (results[10] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        kazino: results[11]?.status === 'fulfilled' ? (results[11] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        cloth: results[12]?.status === 'fulfilled' ? (results[12] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        komnata: results[13]?.status === 'fulfilled' ? (results[13] as PromiseFulfilledResult<HTMLImageElement>).value : null,
        raion: results[14]?.status === 'fulfilled' ? (results[14] as PromiseFulfilledResult<HTMLImageElement>).value : null,
      });

      // Устанавливаем src для кнопок
      setIconSrcs({
        boss: results[7]?.status === 'fulfilled' ? ICON_SRCS.boss : null,
        clans: results[8]?.status === 'fulfilled' ? ICON_SRCS.clans : null,
        arena: results[9]?.status === 'fulfilled' ? ICON_SRCS.arena : null,
        personaz: results[10]?.status === 'fulfilled' ? ICON_SRCS.personaz : null,
        kazino: results[11]?.status === 'fulfilled' ? ICON_SRCS.kazino : null,
        cloth: results[12]?.status === 'fulfilled' ? ICON_SRCS.cloth : null,
        gold: results[4]?.status === 'fulfilled' ? ICON_SRCS.gold : null,
        komnata: results[13]?.status === 'fulfilled' ? '/icon/komnata.jpg' : null,
        raion: results[14]?.status === 'fulfilled' ? '/icon/raion.jpg' : null,
      });

      setIsLoading(false);
    };
    loadAllIcons();
  }, []);

  return useMemo(() => ({ icons, iconSrcs, isLoading }), [icons, iconSrcs, isLoading]);
};