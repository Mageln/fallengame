import type { GameState, MapRaid } from './types';

// The requirement and rewards are game rules, not values supplied by the client.
export const EXTRA_MAP_RAIDS: MapRaid[] = [
  { id: 'raid_railway', x: 0, y: 0, type: 'yellow', name: 'Вокзал', description: 'Обыщите покинутые вагоны. 15 минут', energyCost: 15, requiredCarLevel: 10, rewards: { bullets: 0, matches: 18, materials: 10 }, isRunning: false, completed: false },
  { id: 'raid_farm', x: 0, y: 0, type: 'yellow', name: 'Старый амбар', description: 'Найдите припасы в пустых амбарах. 15 минут', energyCost: 18, requiredCarLevel: 20, rewards: { bullets: 0, matches: 23, materials: 13 }, isRunning: false, completed: false },
  { id: 'raid_quarry', x: 0, y: 0, type: 'red', name: 'Край карьера', description: 'Проберитесь к брошенной технике. 30 минут', energyCost: 25, requiredCarLevel: 35, rewards: { bullets: 0, matches: 32, materials: 19 }, isRunning: false, completed: false },
  { id: 'raid_bunker', x: 0, y: 0, type: 'red', name: 'Вход в бункер', description: 'Опасная вылазка за запасами. 30 минут', energyCost: 30, requiredCarLevel: 50, rewards: { bullets: 0, matches: 42, materials: 25 }, isRunning: false, completed: false },
];


export const RAID_REGIONS = [
  { id: 'railway', name: 'Железнодорожная станция', carLevel: 10, image: '/backgrounds/raid-railway.jpg', raids: ['raid_railway', 'railway_platform', 'railway_depot', 'railway_warehouse'] },
  { id: 'farm', name: 'Заброшенная ферма', carLevel: 20, image: '/backgrounds/raid-farm.jpg', raids: ['raid_farm', 'farm_house', 'farm_silo', 'farm_fields'] },
  { id: 'quarry', name: 'Затопленный карьер', carLevel: 35, image: '/backgrounds/raid-quarry.jpg', raids: ['raid_quarry', 'quarry_tunnel', 'quarry_machines', 'quarry_depot'] },
  { id: 'bunker', name: 'Подземный бункер', carLevel: 50, image: '/backgrounds/raid-bunker.jpg', raids: ['raid_bunker', 'bunker_generator', 'bunker_armory', 'bunker_command'] },
] as const;

const extraPoint = (id: string, name: string, level: number, x: number, y: number, type: 'yellow' | 'red', energy: number, matches: number, materials: number): MapRaid => ({
  id, name, x, y, type, energyCost: energy, requiredCarLevel: level,
  description: type === 'red' ? 'Опасный рейд, 30 минут' : 'Вылазка, 15 минут',
  rewards: { bullets: 0, matches, materials }, isRunning: false, completed: false,
});
EXTRA_MAP_RAIDS.push(
  extraPoint('railway_platform', 'Платформы', 10, 68, 34, 'yellow', 16, 20, 11),
  extraPoint('railway_depot', 'Железнодорожное депо', 10, 27, 66, 'red', 22, 26, 15),
  extraPoint('railway_warehouse', 'Грузовой склад', 10, 68, 70, 'red', 24, 29, 17),
  extraPoint('farm_house', 'Дом фермера', 20, 72, 30, 'yellow', 19, 25, 14),
  extraPoint('farm_silo', 'Зернохранилище', 20, 28, 65, 'red', 24, 31, 18),
  extraPoint('farm_fields', 'Заросшие поля', 20, 72, 70, 'red', 26, 34, 20),
  extraPoint('quarry_tunnel', 'Затопленный тоннель', 35, 72, 30, 'red', 28, 36, 21),
  extraPoint('quarry_machines', 'Стоянка техники', 35, 28, 65, 'yellow', 22, 28, 16),
  extraPoint('quarry_depot', 'Склад карьера', 35, 72, 70, 'red', 30, 39, 23),
  extraPoint('bunker_generator', 'Генераторная', 50, 72, 30, 'red', 32, 44, 26),
  extraPoint('bunker_armory', 'Оружейная', 50, 28, 65, 'red', 34, 47, 28),
  extraPoint('bunker_command', 'Командный пункт', 50, 72, 70, 'red', 36, 50, 30),
);
// Preserve the original four IDs, rewards and timers when moving them onto maps.
for (const region of RAID_REGIONS) {
  const first = EXTRA_MAP_RAIDS.find((raid) => raid.id === region.raids[0]);
  if (first) { first.x = 28; first.y = 30; }
}

export const normalizeMapRaids = (state: GameState): GameState => {
  // Existing players keep access to routes on which they have already made progress.
  if (!Array.isArray(state.unlockedRaidRegions)) {
    const unlockedRaidRegions = RAID_REGIONS.filter((region) => region.raids.some((id) => {
      const raid = state.mapRaids?.find((entry) => entry.id === id);
      return raid?.isRunning || raid?.completed || (state.raidTaskProgress?.[id]?.length ?? 0) > 0;
    })).map((region) => region.id);
    state = { ...state, unlockedRaidRegions };
  }
  const existing = Array.isArray(state.mapRaids) ? state.mapRaids : [];
  const ids = new Set(EXTRA_MAP_RAIDS.map((raid) => raid.id));
  const legacy = existing.filter((raid) => !ids.has(raid.id));
  const additions = EXTRA_MAP_RAIDS.map((definition) => {
    const saved = existing.find((raid) => raid.id === definition.id);
    if (!saved) return { ...definition, rewards: { ...definition.rewards } };
    const rulesMatch = saved.x === definition.x && saved.y === definition.y && saved.name === definition.name
      && saved.type === definition.type && saved.description === definition.description
      && saved.energyCost === definition.energyCost && saved.requiredCarLevel === definition.requiredCarLevel
      && saved.rewards?.bullets === definition.rewards.bullets && saved.rewards?.matches === definition.rewards.matches
      && saved.rewards?.materials === definition.rewards.materials;
    return rulesMatch ? saved : { ...saved, ...definition, isRunning: saved.isRunning, completed: saved.completed };
  });
  const raids = [...legacy, ...additions];
  if (raids.length === existing.length && raids.every((raid, index) => raid === existing[index])) return state;
  return { ...state, mapRaids: raids };
};
