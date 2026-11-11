import { SHOP_CLOTHING } from './shopCatalog';
import type { ClothingEffect } from './shopCatalog';

// Transparent layers share the 402×600 coordinates of pers1.png.
// The original cap uses its existing cropped sprite instead.
const layerOrder = { legs: 0, feet: 1, body: 2, head: 3 } as const;
export const equippedClothingVisuals = (ids: readonly string[]): string[] =>
  SHOP_CLOTHING.filter(entry => entry.item.id !== 'shop_cap' && ids.includes(entry.item.id))
    .sort((a, b) => layerOrder[a.slot] - layerOrder[b.slot]).map(entry => entry.item.id);
export const clothingVisualPath = (id: string): string => `/characters/clothing/${id}.svg`;
export const clothingEffect = (id: string): ClothingEffect | undefined => SHOP_CLOTHING.find(entry => entry.item.id === id)?.effect;
export const EFFECT_COLORS: Record<ClothingEffect, string> = { fire: '#ff6423', electric: '#4cdfff', toxic: '#a1ff42', cosmic: '#d88fff' };
