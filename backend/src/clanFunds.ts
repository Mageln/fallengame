import { CLAN_COST } from './clanRules.js';

// The progress snapshot is server-owned. Never use an amount supplied by a caller
// or the legacy User.gold balance when creating a clan.
export const debitClanCreation = (state: unknown): Record<string, unknown> | null => {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null;
  const progress = state as Record<string, unknown>;
  const gold = progress.gold;
  if (typeof gold !== 'number' || !Number.isSafeInteger(gold) || gold < CLAN_COST) return null;
  return { ...progress, gold: gold - CLAN_COST };
};
