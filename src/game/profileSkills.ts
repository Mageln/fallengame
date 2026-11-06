import type { ProfileSkillId, ProfileSkills } from './types';

export const SKILL_MAX_LEVEL = 10;
// Старые уровни живучести и удачи больше не улучшаются, но их бонусы сохраняются.
export const SKILL_HP_PER_LEVEL = 10;
export const SKILL_LUCK_PER_LEVEL = 20;
export const SKILL_FIST_PERCENT = 10;
export const SKILL_WEAPON_PERCENT = 10;
export const SKILL_BLOCK_PERCENT = 3;
export const SKILL_HEAL_PER_LEVEL = 5;
export const SKILL_DEFS: { id: ProfileSkillId; name: string; description: string; icon: string }[] = [
  { id: 'fist', name: 'Удар кулаком', description: '+10% к урону удара кулаком по боссу за уровень.', icon: '/icon/skills/fist.svg' },
  { id: 'weapon', name: 'Удар оружием', description: '+10% к урону удара оружием по боссу за уровень.', icon: '/icon/skills/weapon.svg' },
  { id: 'block', name: 'Блок', description: '+3 процентных пункта к поглощению урона при активном блоке за уровень.', icon: '/icon/skills/block.svg' },
  { id: 'heal', name: 'Исцеление', description: '+5 HP к исцелению в бою с боссом за уровень.', icon: '/icon/skills/health.svg' },
];
export const skillCost = (level: number) => 50 + level * 50;
export const emptyProfileSkills = (): ProfileSkills => ({ fist: 0, weapon: 0, block: 0, heal: 0, health: 0, luck: 0 });
export const normalizeProfileSkills = (value: Partial<ProfileSkills> | null | undefined): ProfileSkills => {
  const level = (id: keyof ProfileSkills) => Number.isFinite(value?.[id]) ? Math.min(SKILL_MAX_LEVEL, Math.max(0, Math.floor(value![id]!))) : 0;
  return { fist: level('fist'), weapon: level('weapon'), block: level('block'), heal: level('heal'), health: level('health'), luck: level('luck') };
};
