import { useState } from 'react';
import { weaponImage } from '../game/weaponImages';
import type { Weapon } from '../game/types';

export const WeaponImage = ({ weapon, className }: { weapon: Pick<Weapon, 'id' | 'name' | 'icon'>; className?: string }) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = weaponImage(weapon.id);
  if (!src || src === failedSrc) return <span className={className} role="img" aria-label={weapon.name}>{weapon.icon}</span>;
  return <img className={className} src={src} alt={weapon.name} onError={() => setFailedSrc(src)} />;
};
