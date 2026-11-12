import type { GameState, MapRaid } from './types';

// The requirement and rewards are game rules, not values supplied by the client.
export const EXTRA_MAP_RAIDS: MapRaid[] = [
  { id: 'raid_railway', x: 0, y: 0, type: 'yellow', name: 'Железнодорожная станция', description: 'Обыщите покинутые вагоны. 15 минут', energyCost: 15, requiredCarLevel: 10, rewards: { bullets: 0, matches: 18, materials: 10 }, isRunning: false, completed: false },
  { id: 'raid_farm', x: 0, y: 0, type: 'yellow', name: 'Заброшенная ферма', description: 'Найдите припасы в пустых амбарах. 15 минут', energyCost: 18, requiredCarLevel: 20, rewards: { bullets: 0, matches: 23, materials: 13 }, isRunning: false, completed: false },
  { id: 'raid_quarry', x: 0, y: 0, type: 'red', name: 'Затопленный карьер', description: 'Проберитесь к брошенной технике. 30 минут', energyCost: 25, requiredCarLevel: 35, rewards: { bullets: 0, matches: 32, materials: 19 }, isRunning: false, completed: false },
  { id: 'raid_bunker', x: 0, y: 0, type: 'red', name: 'Подземный бункер', description: 'Опасная вылазка за запасами. 30 минут', energyCost: 30, requiredCarLevel: 50, rewards: { bullets: 0, matches: 42, materials: 25 }, isRunning: false, completed: false },
];

export const normalizeMapRaids = (state: GameState): GameState => {
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
