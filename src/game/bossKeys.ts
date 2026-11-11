// One key opens one new fight. The first boss is free.
export const BOSS_KEY_ORDER = ['zombie', 'zombie_brute', '1', '2', '3', '4'] as const;
export const BOSS_KEY_PRICES: Readonly<Record<string, number>> = {
  zombie_brute: 100, '1': 200, '2': 300, '3': 400, '4': 500,
};
export const bossRequiresKey = (bossId: string) => Object.prototype.hasOwnProperty.call(BOSS_KEY_PRICES, bossId);
export const nextBossKeyFor = (bossId: string): string | null => {
  const index = BOSS_KEY_ORDER.findIndex(id => id === bossId);
  return index >= 0 && index < BOSS_KEY_ORDER.length - 1 ? BOSS_KEY_ORDER[index + 1] : null;
};
export const bossKeyCount = (keys: Record<string, number> | undefined, bossId: string): number => {
  const count = keys?.[bossId];
  return typeof count === 'number' && Number.isSafeInteger(count) && count > 0 ? count : 0;
};
export const normalizeBossKeys = (keys: unknown): Record<string, number> => {
  if (!keys || typeof keys !== 'object' || Array.isArray(keys)) return {};
  const source = keys as Record<string, number>;
  return Object.fromEntries(BOSS_KEY_ORDER.filter(bossRequiresKey).map(id => [id, bossKeyCount(source, id)] as const).filter(([, count]) => count > 0));
};
export const addBossKey = (keys: Record<string, number> | undefined, bossId: string): Record<string, number> => ({
  ...normalizeBossKeys(keys), [bossId]: bossKeyCount(keys, bossId) + 1,
});
