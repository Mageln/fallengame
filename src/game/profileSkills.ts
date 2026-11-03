import type { ProfileSkillId, ProfileSkills } from './types';

export const SKILL_MAX_LEVEL = 10;
export const SKILL_HP_PER_LEVEL = 10;
export const SKILL_FIST_PERCENT = 10;
export const SKILL_LUCK_PER_LEVEL = 20;
export const SKILL_BLOCK_PERCENT = 3;
export const SKILL_DEFS: { id: ProfileSkillId; name: string; description: string; icon: string }[] = [
  { id: 'health', name: 'Живучесть', description: '+10 к максимуму и текущему HP за уровень.', icon: '/icon/skills/health.svg' },
  { id: 'fist', name: 'Тяжёлый кулак', description: '+10% урона безоружных приёмов против боссов за уровень.', icon: '/icon/skills/fist.svg' },
  { id: 'luck', name: 'Удача', description: '+20 к удаче и +1% шанса крита на арене боссов за уровень (крит ×1,5).', icon: '/icon/skills/luck.svg' },
  { id: 'block', name: 'Стальная защита', description: '+3 процентных пункта к поглощению урона при активном блоке за уровень.', icon: '/icon/skills/block.svg' },
];
export const skillCost = (level: number) => 50 + level * 50;
export const emptyProfileSkills = (): ProfileSkills => ({ health: 0, fist: 0, luck: 0, block: 0 });
export const normalizeProfileSkills = (value: Partial<ProfileSkills> | null | undefined): ProfileSkills => {
  const level = (id: ProfileSkillId) => Number.isFinite(value?.[id]) ? Math.min(SKILL_MAX_LEVEL, Math.max(0, Math.floor(value![id]!))) : 0;
  return { health: level('health'), fist: level('fist'), luck: level('luck'), block: level('block') };
};
