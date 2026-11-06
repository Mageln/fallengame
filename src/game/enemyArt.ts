// Одна и та же иллюстрация используется в списке и в бою; портрет — её кроп.
type EnemyArt = { face: string; normal: string; enraged: string };
const art = (name: string): EnemyArt => ({
  face: `/enemies/${name}-face.png`, normal: `/enemies/${name}.png`, enraged: `/enemies/${name}-rage.png`,
});
const MIKHALYCH = art('mikhalych');
const DEPARTMENT = art('department');
const TYUMEN = art('tyumen');
const SOTNIK = art('sotnik');
const RAIDER = art('arena-raider');
const MEDIC = art('arena-medic');

// Старым боссам районов сопоставлен наиболее подходящий образ, чтобы
// существующие сохранения тоже показывали изображение в полный рост.
const BOSS_ART: Record<string, EnemyArt> = {
  '1': MIKHALYCH, '2': DEPARTMENT, '3': TYUMEN, '4': SOTNIK,
  resident: MIKHALYCH, citizen: MIKHALYCH, angry: MIKHALYCH,
  police: DEPARTMENT, marauder: MIKHALYCH, smuggler: TYUMEN,
  preacher: TYUMEN, aristocrat: SOTNIK, general: SOTNIK, gast: SOTNIK,
  boss_sever: TYUMEN, boss_cannibal: MIKHALYCH, boss_king: SOTNIK,
  boss_blood_baron: SOTNIK, boss_raider_king: MIKHALYCH, boss_forest_king: TYUMEN,
};
const ARENA_ART: Record<string, EnemyArt> = { raider: RAIDER, guard: DEPARTMENT, medic: MEDIC };
export const getBossArt = (id: string): EnemyArt => Object.prototype.hasOwnProperty.call(BOSS_ART, id) ? BOSS_ART[id] : MIKHALYCH;
export const getArenaArt = (id: string): EnemyArt => Object.prototype.hasOwnProperty.call(ARENA_ART, id) ? ARENA_ART[id] : RAIDER;
export const isEnraged = (hp: number, maxHp: number): boolean =>
  Number.isFinite(hp) && Number.isFinite(maxHp) && maxHp > 0 && hp <= maxHp / 2;
