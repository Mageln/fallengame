import { isEnraged } from './enemyArt';
import { equipmentDamage, medkitHeal, totalStamina, weaponDamage } from './formulas';
import { SKILL_BLOCK_PERCENT, SKILL_FIST_PERCENT, SKILL_HEAL_PER_LEVEL, SKILL_HP_PER_LEVEL, SKILL_WEAPON_PERCENT } from './profileSkills';
import { BOSS_ENERGY_MAX, BOSS_ENERGY_PER_HIT, BOSS_SKILLS, todayUtc } from './survival';
import type { ArenaBattle, ArenaProgress, GameAction, GameState } from './types';

export const ARENA_DAILY_LIMIT = 5;
export const ARENA_OPPONENTS = [
  { id: 'raider', name: 'Ржавый Рейдер', description: 'Атакует сильнее каждый третий ход.', gold: 20, bullets: 25, hpMultiplier: 0.9 },
  { id: 'guard', name: 'Железный Страж', description: 'Каждый третий ход снижает получаемый урон.', gold: 30, bullets: 35, hpMultiplier: 1 },
  { id: 'medic', name: 'Полевой Медик', description: 'Каждый третий ход восстанавливает здоровье.', gold: 40, bullets: 45, hpMultiplier: 1.1 },
] as const;

export const emptyArena = (): ArenaProgress => ({ date: '', used: 0, battle: null });
export const arenaAttemptsLeft = (arena: ArenaProgress | undefined, now = Date.now()): number =>
  Math.max(0, ARENA_DAILY_LIMIT - (arena?.date === todayUtc(now) ? arena.used : 0));

type ArenaAction = Extract<GameAction, { type: 'START_ARENA' | 'ARENA_SKILL' | 'CLOSE_ARENA_BATTLE' }>;
export const reduceArena = (state: GameState, action: ArenaAction, now = Date.now()): GameState => {
  const arena = state.arena ?? emptyArena();
  if (action.type === 'START_ARENA') {
    const opponent = ARENA_OPPONENTS.find((entry) => entry.id === action.opponentId);
    if (!opponent) return state;
    if (state.battle || arena.battle) return { ...state, lastMessage: 'Сначала завершите текущий бой.' };
    if (arenaAttemptsLeft(arena, now) <= 0) return { ...state, lastMessage: 'Попытки арены закончились. Обновление в 00:00 UTC.' };
    const maxHp = Math.max(1, totalStamina(state) + (state.profileSkills?.health ?? 0) * SKILL_HP_PER_LEVEL);
    const baseAttack = Math.max(1, 8 + state.level / 4 + equipmentDamage(state.equipmentIds) + weaponDamage(state));
    const opponentMaxHp = Math.max(40, Math.round((70 + baseAttack * 5) * opponent.hpMultiplier));
    const fistBase = 8 + state.level / 4 + equipmentDamage(state.equipmentIds);
    const battle: ArenaBattle = { opponentId: opponent.id, opponentName: opponent.name, opponentHp: opponentMaxHp, opponentMaxHp,
      playerHp: maxHp, playerMaxHp: maxHp, energy: 0,
      fistDamage: Math.max(1, Math.round(fistBase * (1 + (state.profileSkills?.fist ?? 0) * SKILL_FIST_PERCENT / 100))),
      weaponDamage: Math.max(1, Math.round(baseAttack * (1 + (state.profileSkills?.weapon ?? 0) * SKILL_WEAPON_PERCENT / 100))),
      healing: medkitHeal(state) + (state.profileSkills?.heal ?? 0) * SKILL_HEAL_PER_LEVEL,
      blockReduction: Math.min(0.8, 0.5 + (state.profileSkills?.block ?? 0) * SKILL_BLOCK_PERCENT / 100),
      turn: 1, outcome: 'fighting', reward: null,
      log: [`Бой с ${opponent.name}. Попытка засчитана.`] };
    return { ...state, arena: { date: todayUtc(now), used: (arena.date === todayUtc(now) ? arena.used : 0) + 1, battle }, lastMessage: 'Бой на арене начался.' };
  }
  const battle = arena.battle;
  if (!battle) return state;
  if (action.type === 'CLOSE_ARENA_BATTLE') {
    // Закрытие активного боя — отступление, попытка не возвращается.
    return { ...state, arena: { ...arena, battle: null }, lastMessage: battle.outcome === 'fighting' ? 'Вы отступили с арены. Попытка потрачена.' : 'Итоги арены закрыты.' };
  }
  if (battle.outcome !== 'fighting') return state;
  const skill = BOSS_SKILLS.find((entry) => entry.id === action.skillId);
  const opponent = ARENA_OPPONENTS.find((entry) => entry.id === battle.opponentId);
  if (!skill || !opponent) return state;
  if (battle.energy < skill.energyCost) return { ...state, lastMessage: `Для действия нужно ${skill.energyCost} боевой энергии.` };
  if (skill.id === 'heal' && battle.playerHp >= battle.playerMaxHp) return { ...state, lastMessage: 'Здоровье уже полное.' };
  let energy = skill.id === 'jab' ? Math.min(BOSS_ENERGY_MAX, battle.energy + BOSS_ENERGY_PER_HIT) : battle.energy - skill.energyCost;
  let playerHp = battle.playerHp;
  let opponentHp = battle.opponentHp;
  const log = [...battle.log];
  if (skill.id === 'heal') {
    const healed = Math.min(battle.playerMaxHp - playerHp, battle.healing);
    playerHp += healed;
    log.push(`💚 Исцеление: +${healed} HP.`);
  } else if (skill.id === 'block') {
    log.push('🛡️ Блок приготовлен к ответному удару.');
  } else {
    const guarded = opponent.id === 'guard' && battle.turn % 3 === 0;
    const damage = Math.min(opponentHp, Math.max(1, Math.round((skill.id === 'jab' ? battle.fistDamage : battle.weaponDamage) * (guarded ? 0.6 : 1))));
    opponentHp -= damage;
    log.push(`${skill.icon} ${skill.name}: −${damage} HP${guarded ? ' (противник блокирует)' : ''}.`);
  }
  const enraged = !!battle.enraged || isEnraged(opponentHp, battle.opponentMaxHp);
  if (enraged && !battle.enraged) log.push(`🔥 ${opponent.name} переходит в ярость!`);
  if (opponentHp <= 0) {
    const reward = { gold: opponent.gold, bullets: opponent.bullets };
    return { ...state, gold: state.gold + reward.gold, bullets: state.bullets + reward.bullets,
      arena: { ...arena, battle: { ...battle, playerHp, opponentHp: 0, energy, enraged, outcome: 'won', reward, log: [...log, 'Победа! Награда получена.'].slice(-80) } },
      lastMessage: `Победа на арене: +${reward.gold} припасов, +${reward.bullets} патронов.` };
  }
  if (opponent.id === 'medic' && battle.turn % 3 === 0) {
    const healed = Math.min(battle.opponentMaxHp - opponentHp, Math.max(1, Math.round(battle.opponentMaxHp * 0.04)));
    opponentHp += healed;
    log.push(`💚 Противник восстановил ${healed} HP.`);
  }
  const heavy = opponent.id === 'raider' && battle.turn % 3 === 0;
  const reduction = skill.id === 'block' ? battle.blockReduction : 0;
  const incoming = Math.max(1, Math.round(battle.playerMaxHp * 0.055 * (heavy ? 1.6 : 1) * (1 - reduction)));
  playerHp = Math.max(1, playerHp - incoming);
  log.push(`☠ ${opponent.name}: −${incoming} HP${heavy ? ' (сильный удар)' : ''}.`);
  energy = Math.max(0, energy);
  return { ...state, arena: { ...arena, battle: { ...battle, playerHp, opponentHp, energy, enraged, turn: battle.turn + 1,
    outcome: 'fighting', log: log.slice(-80) } }, lastMessage: `${skill.name}: ход завершён.` };
};
