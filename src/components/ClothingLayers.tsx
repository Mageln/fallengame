import { clothingVisualPath, equippedClothingVisuals } from '../game/clothingVisuals';

export const ClothingLayers = ({ equipmentIds, className }: { equipmentIds: readonly string[]; className: string }) =>
  <>{equippedClothingVisuals(equipmentIds).map(id => <img key={id} className={className} src={clothingVisualPath(id)} alt="" aria-hidden="true" />)}</>;
