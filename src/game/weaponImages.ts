// Asset paths are selected from an allowlist, never from saved or remote input.
const images: Readonly<Record<string, string>> = {
  shop_knuckles: '/weapon/shop_knuckles.jpg', shop_bat: '/weapon/shop_bat.jpg',
  shop_pistol: '/weapon/shop_pistol.jpg', shop_smg: '/weapon/shop_smg.jpg', shop_rifle: '/weapon/shop_rifle.jpg',
  rusty_pistol: '/weapon/shop_pistol.jpg', rusty_crowbar: '/weapon/rusty_crowbar.jpg',
  butcher_cleaver: '/weapon/butcher_cleaver.jpg', nailed_bat: '/weapon/nailed_bat.jpg',
  fireman_axe: '/weapon/fireman_axe.jpg', urban_machete: '/weapon/urban_machete.jpg',
  cold_dawn_katana: '/weapon/katana.jpg', akm_veteran: '/weapon/ak.jpg', mosin_quiet: '/weapon/vintovka.jpg',
  sawed_off: '/weapon/icons/sawed_off.svg', ppsh_violin: '/weapon/icons/ppsh_violin.svg',
  nail_launcher: '/weapon/icons/nail_launcher.svg', pipe_shotgun: '/weapon/icons/pipe_shotgun.svg',
  cleaner_flamer: '/weapon/icons/cleaner_flamer.svg', molotov: '/weapon/icons/molotov.svg',
  hedgehog_grenade: '/weapon/icons/hedgehog_grenade.svg',
};
export const weaponImage = (id: string): string | undefined => Object.prototype.hasOwnProperty.call(images, id) ? images[id] : undefined;
