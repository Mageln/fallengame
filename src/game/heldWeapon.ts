// Full-size transparent overlays share the exact 402×600 coordinates of pers1.png.
// Explicit allowlist prevents arbitrary paths from old or untrusted saves.
const ids = [
  'rusty_pistol', 'rusty_crowbar', 'butcher_cleaver', 'nailed_bat', 'fireman_axe',
  'urban_machete', 'cold_dawn_katana', 'sawed_off', 'ppsh_violin', 'akm_veteran',
  'mosin_quiet', 'nail_launcher', 'pipe_shotgun', 'cleaner_flamer', 'molotov', 'hedgehog_grenade',
  'shop_knuckles', 'shop_bat', 'shop_pistol', 'shop_smg', 'shop_rifle',
] as const;
export const heldWeaponPath = (id: string): string | undefined =>
  ids.some(known => known === id) ? `/characters/weapons/${id}.png` : undefined;

// Кастет использует отдельную кисть; для остальных видов исходный персонаж не меняется.
export const characterSpritePath = (weaponId: string): string =>
  weaponId === 'shop_knuckles' ? '/characters/survivor-no-right-hand.png' : '/pers1.png';
