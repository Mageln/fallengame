import type { ResourceName } from '../components/ResourceIcon';
import type { GameAction, GameState } from './types';

// These are free local-development packs, never real payment products.
export type TopUpResource = 'energy' | 'matches' | 'bullets' | 'gold' | 'zhetons' | 'premium';
export const TOP_UP_PACKS = [10, 50, 100] as const;
export const TOP_UP_DETAILS: Record<TopUpResource, { title: string; label: string; icon: ResourceName }> = {
  energy: { title: 'Пополнить энергию', label: 'Энергия', icon: 'energy' },
  matches: { title: 'Пополнить спички', label: 'Спички', icon: 'matches' },
  bullets: { title: 'Пополнить патроны', label: 'Патроны', icon: 'bullets' },
  gold: { title: 'Пополнить припасы', label: 'Игровые припасы', icon: 'supplies' },
  zhetons: { title: 'Пополнить жетоны', label: 'Жетоны', icon: 'tokens' },
  premium: { title: 'Пополнить премиум-золото', label: 'Премиум-золото', icon: 'premium' },
};

// Server balances and premium currency cannot be credited by this UI.
export const makeTestTopUp = (resource: TopUpResource, amount: number, testMode: boolean, state: GameState): GameAction | null => {
  if (!testMode || resource === 'premium' || !TOP_UP_PACKS.some(pack => pack === amount)) return null;
  if (resource === 'energy' && state.energy >= state.maxEnergy) return null;
  return { type: 'ADD_RESOURCE', resource, amount: resource === 'energy' ? Math.min(amount, state.maxEnergy - state.energy) : amount };
};
