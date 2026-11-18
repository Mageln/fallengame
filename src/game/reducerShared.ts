import { advanceClanContracts } from './clans';
import type { ResourceEvent, ResourceSource } from './survival';
import type { ClanState, ClanTaskEvent, GameState } from './types';

export const msg = (state: GameState, lastMessage: string): GameState => ({ ...state, lastMessage });

export const recordResources = (state: GameState, source: ResourceSource, changes: Partial<Record<ResourceEvent['resource'], number>>): GameState => ({
  ...state,
  resourceEvents: [
    ...Object.entries(changes).filter(([, amount]) => amount && amount !== 0).map(([resource, amount]) => ({
      id: crypto.randomUUID(), at: Date.now(), source, resource: resource as ResourceEvent['resource'], amount: amount!,
    })),
    ...state.resourceEvents,
  ].slice(0, 80),
});

export const replaceClan = (state: GameState, clan: ClanState): GameState => ({
  ...state,
  clan: state.clan?.id === clan.id ? clan : state.clan,
  clanDirectory: state.clanDirectory.some((entry) => entry.id === clan.id)
    ? state.clanDirectory.map((entry) => entry.id === clan.id ? clan : entry)
    : [...state.clanDirectory, clan],
});

export const syncClans = (state: GameState, directory: ClanState[]): GameState => {
  const clans = [...directory];
  if (state.clan && !clans.some((entry) => entry.id === state.clan?.id)) clans.push(state.clan);
  const membership = clans.find((entry) => entry.members.some((member) => member.id === state.playerId));
  return {
    ...state,
    clanDirectory: clans,
    clan: membership ?? null,
    pendingClanId: membership || !clans.some((entry) => entry.id === state.pendingClanId && entry.applications.some((request) => request.userId === state.playerId))
      ? null : state.pendingClanId,
  };
};

export const recordClanEvent = (state: GameState, event: ClanTaskEvent, amount = 1): GameState => {
  if (!state.clan) return state;
  const { clan, awarded } = advanceClanContracts(state.clan, event, amount);
  if (clan === state.clan) return state;
  const next = replaceClan(state, clan);
  if (awarded === 0) return next;
  return {
    ...next,
    notifications: [{ id: `clan-${Date.now()}-${event}`, text: `+${awarded} к рейтингу выживаемости`, createdAt: Date.now(), read: false }, ...state.notifications],
    lastMessage: `Контракт выполнен! +${awarded} к рейтингу выживаемости.`,
  };
};

export const spend = (state: GameState, energy: number): GameState | null => {
  if (state.energy < energy) return null;
  return { ...state, energy: state.energy - energy };
};
