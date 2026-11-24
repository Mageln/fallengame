import { useEffect, useState } from 'react';
import { heldWeaponPath } from '../game/heldWeapon';

// Оружие в портретах — отдельный слой поверх спрайта персонажа.
// Выравнивание одинаковое во всех окнах: полноразмерный кадр 402×600
// масштабируется в портрет целиком, поэтому оружие не уезжает за персонажа.
export const HeldWeapon = ({ weaponId, className }: { weaponId: string; className: string }) => {
  const src = heldWeaponPath(weaponId);
  // Слой не должен висеть от прошлого оружия, пока грузится новое.
  const [loaded, setLoaded] = useState<string | null>(null);
  useEffect(() => { setLoaded(null); }, [src]);
  if (!src) return null;
  return <img className={className} src={src} alt="" aria-hidden="true"
    data-loaded={loaded === src ? 'true' : undefined}
    style={{ opacity: loaded === src ? undefined : 0 }}
    onLoad={() => setLoaded(src)} onError={() => setLoaded(null)} />;
};
