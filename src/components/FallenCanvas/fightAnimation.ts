import type { BattleState } from '../../game/types';
import type { BossFight } from './canvasTypes';

// === Анимации боя: вычисляются из изменений HP (модульное состояние) ===
export const fightAnim = {
  key: '',
  bossHp: 0,
  playerHp: 0,
  bossHitAt: 0,
  playerHitAt: 0,
  missAt: 0,
  lastDamage: 0,
  crit: false,
  lastHit: null as BattleState['lastHit'],
  // Момент окончания боя в шкале performance.now(): reducer хранит endedAt как
  // Date.now(), а анимации живут на performance.now — смешивать их нельзя.
  endAtPerf: 0,
};

export const trackFightHit = (battle: BattleState) => {
  const key = `${battle.bossId}:${battle.startedAt}`;
  if (fightAnim.key !== key) {
    fightAnim.key = key;
    fightAnim.bossHp = battle.bossHp;
    fightAnim.playerHp = battle.playerHp;
    fightAnim.bossHitAt = 0;
    fightAnim.playerHitAt = 0;
    fightAnim.missAt = 0;
    fightAnim.lastDamage = 0;
    fightAnim.crit = false;
    fightAnim.lastHit = battle.lastHit;
    fightAnim.endAtPerf = 0;
    return;
  }
  if (battle.bossHp < fightAnim.bossHp) {
    fightAnim.bossHitAt = performance.now();
    fightAnim.lastDamage = fightAnim.bossHp - battle.bossHp;
  }
  if (battle.playerHp < fightAnim.playerHp) {
    fightAnim.playerHitAt = performance.now();
  }
  // Новый ход игрока: reducer создаёт новый lastHit — фиксируем крит/промах
  if (battle.lastHit && battle.lastHit !== fightAnim.lastHit) {
    fightAnim.crit = battle.lastHit.crit;
    if (battle.lastHit.missed) fightAnim.missAt = performance.now();
    fightAnim.lastHit = battle.lastHit;
  }
  if (battle.outcome !== 'fighting' && fightAnim.endAtPerf === 0) {
    fightAnim.endAtPerf = performance.now();
  }
  fightAnim.bossHp = battle.bossHp;
  fightAnim.playerHp = battle.playerHp;
};

// Адаптер BattleState → BossFight для анимаций боя
export const battleToFight = (battle: BattleState, anim: typeof fightAnim, res?: { medkits: number; grenades: number }): BossFight => ({
  bossId: battle.bossId,
  bossName: battle.bossName,
  bossColor: '#aa3333',
  bossHp: battle.bossHp,
  bossMaxHp: battle.bossMaxHp,
  playerHp: battle.playerHp,
  playerMaxHp: battle.playerMaxHp,
  startedAt: battle.startedAt,
  bossHitAt: anim.bossHitAt ?? 0,
  playerHitAt: anim.playerHitAt ?? 0,
  missAt: anim.missAt ?? 0,
  lastDamage: anim.lastDamage,
  crit: anim.crit,
  outcome: battle.outcome,
  // Шкала performance.now() — иначе анимация панели победы никогда не стартует
  endedAt: anim.endAtPerf > 0 ? anim.endAtPerf : undefined,
  reward: battle.reward ? { gold: battle.reward.gold, bullets: battle.reward.bullets, room: battle.reward.room } : undefined,
  turn: battle.turn,
  turnLimit: battle.turnLimit,
  cooldowns: battle.cooldowns,
  stunTurns: battle.statuses.stunTurns,
  poisonTurns: battle.statuses.poisonTurns,
  poisonDamage: battle.statuses.poisonDamage,
  weakPointTurns: battle.weakPointTurns,
  medkits: res?.medkits ?? 0,
  grenades: res?.grenades ?? 0,
  lastHit: battle.lastHit,
});
