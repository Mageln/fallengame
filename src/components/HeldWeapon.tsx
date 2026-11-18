import { heldWeaponPath } from '../game/heldWeapon';

export const HeldWeapon = ({ weaponId, className }: { weaponId: string; className: string }) => {
  const src = heldWeaponPath(weaponId);
  return src ? <img className={className} src={src} alt="" aria-hidden="true" /> : null;
};
