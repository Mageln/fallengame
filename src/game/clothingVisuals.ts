// Full-size transparent layers share the 402×600 coordinates of pers1.png.
// The existing cap remains separate because its image is a cropped sprite.
export const CLOTHING_VISUALS = [
  'shop_pants', 'shop_boots', 'shop_jacket', 'shop_armor', 'shop_helmet',
] as const;
export const equippedClothingVisuals = (ids: readonly string[]): string[] =>
  CLOTHING_VISUALS.filter(id => ids.includes(id));
export const clothingVisualPath = (id: string): string => `/characters/clothing/${id}.svg`;
