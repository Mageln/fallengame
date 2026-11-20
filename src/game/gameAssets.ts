// Изображения из public, которые игра использует сразу: греем их до входа.
// Критичные нужны для первого экрана (дом/канвас, верхняя панель, карта),
// отложенные (казино, боссы, оружие, галерея комнат) грузятся по требованию,
// чтобы не тормозить вход.

export const CRITICAL_IMAGES: string[] = [
  '/1.png',
  '/background.webp',
  '/pers1.png',
  '/upperbackground.png',
  '/logo.svg',

  '/icon/arena.jpg',
  '/icon/boss.jpg',
  '/icon/clans.jpg',
  '/icon/clans.png',
  '/icon/cloth.jpg',
  '/icon/friends.png',
  '/icon/kazino.jpg',
  '/icon/komnata.jpg',
  '/icon/personaz.jpg',
  '/icon/plus.webp',
  '/icon/quest.png',

  '/icon/skills/fist.webp',
  '/icon/skills/weapon.webp',
  '/icon/skills/block.webp',
  '/icon/skills/heal.webp',
  '/icon/raion.jpg',

  '/icon/resource/bullets.png',
  '/icon/resource/energy.png',
  '/icon/resource/gold.png',
  '/icon/resource/spicki.png',
  '/icon/resource/zheton.png',

  '/map/iconboss.jpg',
  '/map/map.webp',
];

export const DEFERRED_IMAGES: string[] = [
  '/bossRoom/FonLoot.webp',
  '/bossRoom/fonIconBoss.webp',
  '/bossRoom/fonWinnera.webp',

  '/enemy/avatar-boss.webp',
  '/enemy/boss1.webp',
  '/enemy/zombi.webp',
  '/enemy/zombi1.jpg',

  '/room1.webp',
  '/room2.webp',
  '/room3.webp',
  '/room4.webp',
  '/room5.webp',
  '/room6.webp',

  '/weapon/ak.webp',
  '/weapon/awp.webp',
  '/weapon/deagle.jpg',
  '/weapon/katana.jpg',
  '/weapon/m4a4.webp',
  '/weapon/vetka.webp',
  '/weapon/vintovka.jpg',

  '/casino/bg.webp',
  '/casino/symbol-cap.webp',
  '/casino/symbol-pistol.webp',
  '/casino/symbol-radio.webp',
  '/casino/symbol-zombie.webp',
  '/casino/safe-1.webp',
  '/casino/safe-2.webp',
  '/casino/safe-3.webp',
  '/casino/card-back.webp',
  '/casino/card-face-loss.webp',
  '/casino/card-face-return.webp',
  '/casino/card-face-win.webp',
  '/casino/badge-radio.webp',
  '/casino/badge-crown.webp',
];

// Полный список для совместимости (тесты, старые импорты).
export const GAME_IMAGES: string[] = [...CRITICAL_IMAGES, ...DEFERRED_IMAGES];

// Фоновая догрузка отложенных картинок после входа (не блокирует UI).
export const preloadDeferredImages = (): void => {
  if (typeof window === 'undefined') return;
  const load = () => {
    for (const src of DEFERRED_IMAGES) {
      const img = new Image();
      img.src = src;
    }
  };
  const w = window as unknown as { requestIdleCallback?: (cb: () => void) => void };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(load);
  } else {
    setTimeout(load, 1500);
  }
};
