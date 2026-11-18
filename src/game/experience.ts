// Опыт накапливается отдельно от существующей прокачки уровня за патроны.
export const bossExperience = (maxHp: number): number => 100 + Math.floor(Math.max(0, maxHp) / 10);
export const mapRaidExperience = (type: 'yellow' | 'red'): number => type === 'red' ? 40 : 20;
export const RAID_LOOT_EXPERIENCE = 20;
