import { Fragment } from 'react';

export const RESOURCE_ICONS = {
  energy: { src: '/icon/resources/energy.png', label: 'энергия' },
  bullets: { src: '/icon/resources/bullets.png', label: 'патроны' },
  supplies: { src: '/icon/resources/supplies.png', label: 'припасы' },
  premium: { src: '/icon/resources/premium.png', label: 'премиум-золото' },
  tokens: { src: '/icon/resources/tokens.png', label: 'жетоны' },
  matches: { src: '/icon/resources/matches.png', label: 'спички' },
  caps: { src: '/icon/resources/caps.png', label: 'крышки' },
  medkits: { src: '/icon/resources/medkits.png', label: 'аптечки' },
  grenades: { src: '/icon/resources/grenades.png', label: 'гранаты' },
  keys: { src: '/icon/resources/keys.png', label: 'ключи' },
} as const;
export type ResourceName = keyof typeof RESOURCE_ICONS;

export const ResourceIcon = ({ name }: { name: ResourceName }) => {
  const icon = RESOURCE_ICONS[name];
  return <img src={icon.src} alt={icon.label} draggable={false} style={{ display: 'inline-block', width: '1.35em', height: '1.35em', objectFit: 'contain', verticalAlign: '-0.27em', border: 0, boxShadow: 'none', flexShrink: 0 }} />;
};

// Локальные сообщения игры хранятся строками. Заменяем только обозначения
// ресурсов при выводе, не меняя текст сохранения и игровые правила.
const TEXT_ICONS: Record<string, ResourceName> = {
  '⚡': 'energy', '🔫': 'bullets', '💰': 'supplies', '🪙': 'premium',
  '🎟️': 'tokens', '🎫': 'tokens', '🔥': 'matches', '🪵': 'matches',
  '🥤': 'caps', '💊': 'medkits', '💣': 'grenades', '🗝️': 'keys', '🔑': 'keys',
};
const resourcePattern = /(🎟️|🗝️|⚡|🔫|💰|🪙|🎫|🔥|🪵|🥤|💊|💣|🔑)/u;
export const ResourceText = ({ text }: { text: string }) => <>{text.split(resourcePattern).map((part, index) =>
  Object.prototype.hasOwnProperty.call(TEXT_ICONS, part) ? <ResourceIcon key={index} name={TEXT_ICONS[part]} /> : <Fragment key={index}>{part}</Fragment>
)}</>;
