import type { Prisma } from '@prisma/client';
import { BOSSES, bossExperience } from './generated/game.js';
import { applyCombatAction } from './progressCombat.js';
import { joinCoopBoss, takeCoopDamage } from './coopBoss.js';

type State = Record<string, any>;
type Action = Record<string, unknown>;
type Boss = { id: string; hp: number; maxHp: number; status: 'alive' | 'dead' };
type Award = { xp: number; gold: number; bullets: number };

// All calls use one transaction with the player locked before the encounter.
// No client-provided HP, damage or reward is used.
export const syncCoopBattle = async (tx: Prisma.TransactionClient, state: State, vkId: number, now: number): Promise<State> => {
  const battle = state.battle;
  if (battle?.source !== 'boss' || typeof battle.coopEncounterId !== 'string') return state;
  const rows = await tx.$queryRaw<Boss[]>`SELECT "id", "hp", "maxHp", "status" FROM "CoopBoss" WHERE "id" = ${battle.coopEncounterId} FOR UPDATE`;
  const boss = rows[0];
  if (!boss) throw new Error('Shared boss not found');
  const attackers = await tx.$queryRaw<{ vkId: number; damage: number }[]>`SELECT "vkId", "damage" FROM "CoopBossAttacker" WHERE "encounterId" = ${boss.id} ORDER BY "vkId"`;
  const mine = attackers.find(a => a.vkId === vkId);
  const info = { ...battle, bossHp: boss.hp, bossMaxHp: boss.maxHp, damageDealt: mine?.damage ?? 0, coopParticipants: attackers.length };
  if (boss.status === 'alive') return { ...state, battle: info };
  const rewards = await tx.$queryRaw<Award[]>`SELECT "xp", "gold", "bullets" FROM "CoopBossReward" WHERE "encounterId" = ${boss.id} AND "vkId" = ${vkId}`;
  const reward = rewards[0];
  const newOutcome = reward ? 'won' : 'lost';
  const firstNotice = battle.outcome === 'fighting';
  return { ...state, battle: { ...info, outcome: newOutcome, endedAt: battle.endedAt ?? now,
    reward: reward ? { experience: reward.xp, gold: reward.gold, bullets: reward.bullets, keys: 0, zhetons: 0, dropped: false, room: null, roomChance: 0 } : null,
    log: firstNotice ? [...battle.log, reward ? 'Общий босс повержен. Ваша награда начислена.' : 'Общий босс повержен без вашего участия.'] : battle.log },
    lastMessage: firstNotice ? (reward ? 'Общий босс повержен. Награда начислена.' : 'Босс повержен до вашего удара.') : state.lastMessage };
};

export const applyCoopProgressAction = async (tx: Prisma.TransactionClient, state: State, action: Action, vkId: number, revision: number, now: number): Promise<State> => {
  let current = await syncCoopBattle(tx, state, vkId, now);
  const priorBattle = current.battle;
  const isCoop = priorBattle?.source === 'boss' && typeof priorBattle.coopEncounterId === 'string';
  if (isCoop && action.type === 'LEAVE_BATTLE' && priorBattle.outcome !== 'fighting') {
    // The ledger, not the old solo reducer, credits the reward exactly once.
    return { ...current, battle: null, battleVisible: false, lastMessage: 'Итоги совместного боя закрыты.' };
  }
  if (isCoop && priorBattle.outcome !== 'fighting' && action.type === 'BOSS_SKILL') return current;
  const next = applyCombatAction(current, action, now) as State;
  if (action.type === 'START_BOSS_FIGHT' && !priorBattle && next.battle?.source === 'boss' && next.battle?.outcome === 'fighting') {
    const def = BOSSES.find(b => b.id === next.battle.bossId);
    if (!def) throw new Error('Unknown boss');
    const boss = await joinCoopBoss(tx, { bossId: def.id, maxHp: def.hp, rewardXp: bossExperience(def.hp), rewardGold: def.reward.gold, rewardBullets: def.reward.bullets });
    current = { ...next, battle: { ...next.battle, coopEncounterId: boss.id, bossHp: boss.hp, bossMaxHp: boss.maxHp, coopParticipants: 0 } };
    return syncCoopBattle(tx, current, vkId, now);
  }
  if (!isCoop || action.type !== 'BOSS_SKILL' || !next.battle) return next;
  const damage = priorBattle.bossHp - next.battle.bossHp;
  if (damage <= 0) return next;
  // revision is locked and server-issued; retrying a stale command cannot hit twice.
  const hit = await takeCoopDamage(tx, priorBattle.coopEncounterId, vkId, `revision-${revision}`, damage);
  if (hit.duplicate || hit.damage !== damage) throw new Error('Shared hit did not match the validated action');
  // bossKilled() belongs to the old solo path: remove its room roll and reward.
  current = hit.status === 'dead' ? { ...next, lastRoomRoll: state.lastRoomRoll, pendingRoomDrop: state.pendingRoomDrop,
    battle: { ...next.battle, outcome: 'fighting', reward: null, endedAt: null } } : next;
  return syncCoopBattle(tx, current, vkId, now);
};
