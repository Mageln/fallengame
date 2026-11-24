import { useState } from 'react';
import { clothingEffect, clothingVisualPath, equippedClothingVisuals, EFFECT_COLORS } from '../game/clothingVisuals';
import type { CSSProperties } from 'react';
import './ClothingLayers.scss';

// Слой одежды показывается только после загрузки файла: так шлем или куртка
// не «прыгают» на место уже после того, как игрок увидел портрет.
const ClothingLayer = ({ id, className }: { id: string; className: string }) => {
  const [loaded, setLoaded] = useState(false);
  const effect = clothingEffect(id);
  return <img className={`${className}${effect ? ' animated-clothing' : ''}`}
    style={{ ...(effect ? { '--clothing-glow': EFFECT_COLORS[effect] } as CSSProperties : undefined), opacity: loaded ? undefined : 0 }}
    src={clothingVisualPath(id)} alt="" aria-hidden="true"
    onLoad={() => setLoaded(true)} onError={() => setLoaded(false)} />;
};

export const ClothingLayers = ({ equipmentIds, className }: { equipmentIds: readonly string[]; className: string }) =>
  <>{equippedClothingVisuals(equipmentIds).map(id => <ClothingLayer key={id} id={id} className={className} />)}</>;
