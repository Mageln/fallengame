import type { CSSProperties } from 'react';

export const QUEST_ICONS: Readonly<Record<string, string>> = {
  q1: '/icon/quests/target.png',
  q2: '/icon/quests/patrol.png',
  q3: '/icon/quests/raid.png',
  q4: '/icon/quests/car.png',
  q5: '/icon/quests/craft.png',
  q6: '/icon/quests/hunter.png',
};
export const QUEST_CHEST_ICON = '/icon/quests/chest.png';

type IconProps = { className?: string; style?: CSSProperties };
export const QuestIcon = ({ questId, className, style }: IconProps & { questId: string }) => {
  const src = Object.prototype.hasOwnProperty.call(QUEST_ICONS, questId) ? QUEST_ICONS[questId] : undefined;
  return src ? <img src={src} alt="" className={className} style={style} draggable={false} /> : null;
};
export const QuestChestIcon = ({ className, style }: IconProps) =>
  <img src={QUEST_CHEST_ICON} alt="" className={className} style={style} draggable={false} />;
