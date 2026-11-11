import { clothingEffect, clothingVisualPath, equippedClothingVisuals, EFFECT_COLORS } from '../game/clothingVisuals';
import type { CSSProperties } from 'react';
import './ClothingLayers.scss';

export const ClothingLayers = ({ equipmentIds, className }: { equipmentIds: readonly string[]; className: string }) =>
  <>{equippedClothingVisuals(equipmentIds).map(id => {
    const effect = clothingEffect(id);
    return <img key={id} className={`${className}${effect ? ' animated-clothing' : ''}`} style={effect ? { '--clothing-glow': EFFECT_COLORS[effect] } as CSSProperties : undefined} src={clothingVisualPath(id)} alt="" aria-hidden="true" />;
  })}</>;
