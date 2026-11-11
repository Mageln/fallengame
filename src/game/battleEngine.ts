import { nextBossKeyFor } from './bossKeys';
import { SKILL_BLOCK_PERCENT, SKILL_HP_PER_LEVEL } from './profileSkills';
import { bossExperience } from './experience';
import { DAILY_QUESTS, getNextLockedRoom, WEAPON_BREAK_CHANCE, TURN_LIMIT, WEAK_POINT_STREAK, WEAK_POINT_TURNS, ENRAGE_THRESHOLD, STUN_CHANCE, POISON_CHANCE, POISON_TURNS, POISON_DAMAGE, BLOCK_COUNTER_MUL, EVADE_COUNTER_MUL } from './constants';
import { totalStamina, ammoCostOf, bossBaseDamage, counterDamage, durabilityLossOf, maxDurabilityOf, blockCounterChance, playerEvasion, resolveIncoming } from './formulas';
import { BOSSES } from './bosses';
import { getBossAttackEntry, resetBossAttacks, setBossAttackEntry } from './bossAttacks';
import { BOSS_ATTACK_CONFIG, BOSS_COUNTER_MS, BOSS_DURATION_MS, BOSS_ENERGY_MAX, BOSS_LOG_LIMIT, DAILY_BOSS_ATTACKS, roomDropChance } from './survival';
import { msg } from './reducerShared';
import type { BattleState, GameState } from './types';

// ── ПОШАГОВЫЙ БОЕВОЙ ДВИЖОК (Блок 2) ────────────────────────────────────────
// Раунд = действие игрока → ответ босса → статусы → таймеры.
// Все броски случайности сосредоточены здесь, формулы — в formulas.ts.

type CooldownKey = 'technique' | 'power' | 'combo' | 'evade';

const freshCooldowns = (): BattleState['cooldowns'] => ({ technique: 0, power: 0, combo: 0, evade: 0 });
const freshStatuses = (): BattleState['statuses'] => ({
  poisonTurns: 0,
  poisonDamage: 0,
  stunTurns: 0,
  aimDebuffTurns: 0,
});

// Бои из старых сохранений не содержат полей пошаговой механики — дозаполняем.
export const normalizeBattle = (battle: BattleState): BattleState => ({
  ...battle,
  turn: battle.turn ?? 1,
  turnLimit: battle.turnLimit ?? TURN_LIMIT[battle.source] ?? 20,
  comboStreak: battle.comboStreak ?? 0,
  blocking: battle.blocking ?? false,
  evading: battle.evading ?? false,
  cooldowns: { ...freshCooldowns(), ...(battle.cooldowns ?? {}) },
  statuses: { ...freshStatuses(), ...(battle.statuses ?? {}) },
  weakPointTurns: battle.weakPointTurns ?? 0,
  lastHit: battle.lastHit ?? null,
  damageDealt: battle.damageDealt ?? 0,
  endsAt: battle.endsAt ?? (battle.startedAt + BOSS_DURATION_MS),
  lastCounterAt: battle.lastCounterAt ?? battle.startedAt,
  bossEnergy: Math.max(0, Math.min(BOSS_ENERGY_MAX, Number.isFinite(battle.bossEnergy) ? battle.bossEnergy! : 0)),
  skillReadyAt: battle.skillReadyAt ?? {},
  lastSkillId: battle.lastSkillId ?? null,
});

export const startBattle = (
  state: GameState,
  bossId: string,
  bossName: string,
  bossHp: number,
  source: BattleState['source'],
  bossMaxHp = bossHp
): GameState => {
  if (state.battle) return { ...state, battleVisible: true, lastMessage: 'Продолжается текущий бой.' };
  if (state.arena?.battle?.outcome === 'fighting') return msg(state, 'Сначала завершите бой на арене.');
  let current = resetBossAttacks(state);
  if (source === 'boss' && BOSS_ATTACK_CONFIG.timedLimits) {
    const def = BOSSES.find((b) => b.id === bossId);
    const dailyLimit = def?.dailyLimit ?? DAILY_BOSS_ATTACKS;
    const entry = getBossAttackEntry(current, bossId);
    if (entry.used >= dailyLimit + entry.purchased) {
      return msg(current, `ЛИМИТ ИСЧЕРПАН: ${bossName}. Докупите атаку или дождитесь обновления попыток.`);
    }
    current = setBossAttackEntry(current, bossId, { ...entry, used: entry.used + 1 });
  }
  const hp = Math.max(1, totalStamina(current) + (current.profileSkills?.health ?? 0) * SKILL_HP_PER_LEVEL);
  const limit = TURN_LIMIT[source];
  const now = Date.now();
  return {
    ...current,
    battleVisible: true,
    showBossModal: false,
    battle: {
      bossId,
      bossName,
      bossHp,
      bossMaxHp,
      playerHp: hp,
      playerMaxHp: hp,
      log: [`Бой: ${bossName}. Без лимита ходов.`],
      friends: [],
      source,
      shakeTimer: 0,
      flashTimer: 0,
      damageNumber: null,
      turn: 1,
      turnLimit: limit,
      comboStreak: 0,
      blocking: false,
      evading: false,
      cooldowns: freshCooldowns(),
      statuses: freshStatuses(),
      weakPointTurns: 0,
      lastHit: null,
      outcome: 'fighting',
      startedAt: now,
      endedAt: null,
      reward: null,
      damageDealt: 0,
      endsAt: now + BOSS_DURATION_MS,
      lastCounterAt: now,
      bossEnergy: 0,
      skillReadyAt: {},
      lastSkillId: null,
    },
  };
};

// Расход боеприпасов. Если патронов не хватает — стреляем прикладом (DRY_FIRE_MUL).
export const spendAmmo = (state: GameState, hits: number): { state: GameState; dryFire: boolean } => {
  const cost = ammoCostOf(state.weapon) * hits;
  if (cost <= 0) return { state, dryFire: false };
  if (state.bullets >= cost) {
    return { state: { ...state, bullets: state.bullets - cost }, dryFire: false };
  }
  return { state, dryFire: true };
};

// Износ прочности: при нуле оружие разваливается, при износе <25% есть шанс поломки.
export const wearWeapon = (state: GameState, hits: number): { state: GameState; broke: boolean } => {
  const w = state.weapon;
  if (w.broken) return { state, broke: false };
  const durability = Math.max(0, w.durability - durabilityLossOf(w) * hits);
  const max = maxDurabilityOf(w);
  const collapses =
    durability > 0 && max > 0 && durability / max < 0.25 && Math.random() < WEAPON_BREAK_CHANCE / 3;

  if (durability <= 0 || collapses) {
    return { state: { ...state, weapon: { ...w, durability: 0, broken: true } }, broke: true };
  }
  return { state: { ...state, weapon: { ...w, durability } }, broke: false };
};

// Засчитывает убийство босса в ежедневные квесты.
export const bumpKillQuests = (state: GameState): GameState => ({
  ...state,
  daily: {
    ...state.daily,
    quests: state.daily.quests.map((qp) => {
      if (qp.questId !== 'q1' && qp.questId !== 'q6') return qp;
      const quest = DAILY_QUESTS.find((q) => q.id === qp.questId);
      const target = quest?.target ?? 0;
      const progress = Math.min(target, qp.progress + 1);
      return { ...qp, progress, completed: progress >= target };
    }),
  },
});

// Keep a useful but bounded history in local and server battle state.
export const appendBossLog = (log: string[], line: string): string[] => [...log, line].slice(-BOSS_LOG_LIMIT);

export const bossKilled = (state: GameState, battle: BattleState): GameState => {
  const bullets = 12 + Math.floor(Math.random() * 10);
  const zhetons = battle.source === 'gast' ? 8 : 2;
  const gold = battle.source === 'gast' ? 5 : 0;
  // Для канвасных боссов ('boss') берём награду из реестра BOSSES
  const bossReward = battle.source === 'boss'
    ? BOSSES.find((b) => b.id === battle.bossId)?.reward
    : undefined;

  const candidate = bossReward?.room && !state.unlockedRooms.includes(bossReward.room)
    ? bossReward.room : getNextLockedRoom(state.unlockedRooms)?.id ?? null;
  const chance = roomDropChance(battle.damageDealt);
  const dropped = candidate !== null && Math.random() < chance;
  const roll = { roomId: candidate, chance, damage: battle.damageDealt, dropped, at: Date.now() };

  return {
    ...state,
    lastRoomRoll: roll,
    pendingRoomDrop: dropped ? roll : state.pendingRoomDrop,
    health: state.health,
    battle: {
      ...battle,
      bossHp: 0,
      outcome: 'won',
      endedAt: Date.now(),
      reward: {
        experience: battle.source === 'boss' ? bossExperience(battle.bossMaxHp) : 0,
        nextBossKey: battle.source === 'boss' ? nextBossKeyFor(battle.bossId) : null,
        bullets: bossReward?.bullets ?? bullets,
        keys: bossReward ? 1 : (battle.source === 'gast' ? 0 : 1),
        zhetons: battle.source === 'boss' ? 0 : zhetons,
        gold: bossReward?.gold ?? gold,
        room: dropped ? candidate : null,
        roomChance: chance,
        dropped,
      },
      log: battle.source === 'boss' ? appendBossLog(battle.log, `${battle.bossName} повержен! Забирайте награду.`) : [...battle.log, `${battle.bossName} повержен! Забирайте награду.`],
    },
    lastMessage: `${battle.bossName} повержен! ${dropped ? 'ВЫПАЛО: найдена комната!' : 'НЕ ВЫПАЛО'} (${Math.round(chance * 100)}%).`,
  };
};

export const advanceBossClock = (state: GameState, now: number): GameState => {
  if (!state.battle || state.battle.source !== 'boss' || state.battle.outcome !== 'fighting') return state;
  const battle = normalizeBattle(state.battle);
  const strikes = Math.max(0, Math.floor((now - battle.lastCounterAt) / BOSS_COUNTER_MS));
  let playerHp = battle.playerHp;
  let counterLog = battle.log;
  if (strikes > 0) {
    const reduction = Math.min(0.9, 0.6 + (state.profileSkills?.block ?? 0) * SKILL_BLOCK_PERCENT / 100);
    const zombie = battle.bossId === 'zombie' || battle.bossId === 'zombie_brute'
      ? BOSSES.find((boss) => boss.id === battle.bossId) : undefined;
    if (zombie) {
      // Время первого удара и номер последнего удара сохраняются в BattleState.
      // Так одна большая пауза и несколько отдельных тиков дают одинаковый результат.
      const previous = Math.max(0, Math.floor((battle.lastCounterAt - battle.startedAt) / BOSS_COUNTER_MS));
      const strongCount = zombie.id === 'zombie_brute'
        ? Math.floor((previous + strikes) / 3) - Math.floor(previous / 3) : 0;
      const normalCount = strikes - strongCount;
      const firstStrong = zombie.id === 'zombie_brute' && (previous + 1) % 3 === 0;
      const firstDamage = zombie.damage * (firstStrong ? 2 : 1);
      const blocked = battle.blocking ? Math.floor(firstDamage * reduction) : 0;
      const damage = normalCount * zombie.damage + strongCount * zombie.damage * 2 - blocked;
      playerHp = Math.max(1, playerHp - damage);
      const actualDamage = battle.playerHp - playerHp;
      const attack = strikes === 1
        ? (firstStrong ? 'Сильная атака' : 'Обычная атака')
        : `Атаки: обычных ${normalCount}, сильных ${strongCount}`;
      counterLog = appendBossLog(battle.log, `${battle.bossName}: ${attack}, −${actualDamage} HP${battle.blocking ? ' (блок)' : ''}.`);
    } else {
      const perStrike = Math.max(2, Math.floor(bossBaseDamage(battle.bossMaxHp) / 2));
      playerHp = Math.max(1, playerHp - strikes * perStrike + (battle.blocking ? Math.floor(perStrike * reduction) : 0));
      counterLog = appendBossLog(battle.log, `${battle.bossName}: ${strikes} ответных ударов в фоне.`);
    }
  }
  const next = {
    ...battle,
    playerHp,
    blocking: strikes > 0 ? false : battle.blocking,
    lastCounterAt: battle.lastCounterAt + strikes * BOSS_COUNTER_MS,
    log: counterLog,
  };
  return strikes > 0 ? { ...state, battle: next } : state;
};

interface RoundOptions {
  log: string[]; // строки лога от действия игрока
  bossDamage: number;
  streak: number; // новая серия попаданий
  blocking?: boolean;
  evading?: boolean;
  heal?: number; // лечение за этот ход (аптечка)
  curePoison?: boolean; // аптечка выводит яд
  lastHit?: BattleState['lastHit'];
  setCooldown?: { key: CooldownKey; turns: number };
  consumeStun?: boolean; // действие тратится на приход в себя после оглушения
}

// Главный раунд боя: урон по боссу → ответ босса → ответные удары → статусы → таймеры.
export const runRound = (state: GameState, battle: BattleState, opts: RoundOptions): GameState => {
  const bossHp = Math.max(0, battle.bossHp - opts.bossDamage);
  const log = [...battle.log, ...opts.log];
  const statuses = { ...battle.statuses };
  const cooldowns = { ...battle.cooldowns };
  if (opts.setCooldown) cooldowns[opts.setCooldown.key] = opts.setCooldown.turns;
  if (opts.consumeStun) statuses.stunTurns = 0;

  // Слабая точка открывается серией попаданий и живёт несколько ходов
  const weakPointTurns =
    opts.streak >= WEAK_POINT_STREAK ? WEAK_POINT_TURNS : Math.max(0, battle.weakPointTurns - 1);

  // 1) Босс добит ударом игрока
  if (bossHp <= 0) {
    return bossKilled(state, { ...battle, bossHp: 0, log, damageDealt: battle.damageDealt + battle.bossHp, lastHit: opts.lastHit ?? battle.lastHit });
  }

  // 2) Ответ босса: уклонение → блок → броня → ярость
  const enraged = bossHp / battle.bossMaxHp <= ENRAGE_THRESHOLD;
  const evaded = opts.evading === true || Math.random() < playerEvasion(state);
  const incoming = resolveIncoming(state, bossBaseDamage(battle.bossMaxHp), {
    blocking: opts.blocking,
    evaded,
    enraged,
  });

  let playerHp = Math.max(1, battle.playerHp - incoming.damage);
  if (incoming.evaded) {
    log.push(`${battle.bossName} мажет — вы ушли от удара`);
  } else {
    log.push(
      `${battle.bossName} бьёт на ${incoming.damage}${opts.blocking ? ' (блок)' : ''}${enraged ? ' [ярость]' : ''}`
    );
  }

  // Лечение и снятие яда (аптечка) — применяются до ответных ударов
  if (opts.heal && opts.heal > 0) {
    const before = playerHp;
    playerHp = Math.min(battle.playerMaxHp, playerHp + opts.heal);
    log.push(`Исцеление: +${playerHp - before} HP`);
  }
  if (opts.curePoison && statuses.poisonTurns > 0) {
    statuses.poisonTurns = 0;
    statuses.poisonDamage = 0;
    log.push('Яд выведен');
  }

  // 3) Ответные удары: из блока и после уклонения
  let bossHpAfter = bossHp;
  if (opts.blocking && !incoming.evaded && Math.random() < blockCounterChance(state)) {
    const counter = counterDamage(state, BLOCK_COUNTER_MUL);
    bossHpAfter = Math.max(0, bossHpAfter - counter);
    log.push(`Контратака из блока: ${counter}`);
  }
  if (opts.evading && incoming.evaded) {
    const counter = counterDamage(state, EVADE_COUNTER_MUL);
    bossHpAfter = Math.max(0, bossHpAfter - counter);
    log.push(`Ответ после уклонения: ${counter}`);
  }
  if (bossHpAfter <= 0) {
    return bossKilled(state, { ...battle, bossHp: 0, playerHp, log, damageDealt: battle.damageDealt + battle.bossHp, lastHit: opts.lastHit ?? battle.lastHit });
  }

  // 4) Яд доедает в конце раунда
  if (statuses.poisonTurns > 0) {
    playerHp = Math.max(1, playerHp - statuses.poisonDamage);
    statuses.poisonTurns -= 1;
    log.push(`Яд: −${statuses.poisonDamage} HP`);
  }

  // 5) В ярости босс оглушает или травит
  if (enraged && playerHp > 0) {
    if (statuses.stunTurns <= 0 && Math.random() < STUN_CHANCE) {
      statuses.stunTurns = 1;
      log.push(`${battle.bossName} валит вас с ног — вы оглушены`);
    } else if (statuses.poisonTurns <= 0 && Math.random() < POISON_CHANCE) {
      statuses.poisonTurns = POISON_TURNS;
      statuses.poisonDamage = POISON_DAMAGE;
      log.push(`${battle.bossName} обдаёт ядовитой волной`);
    }
  }

  // 7) Конец раунда: таймеры вниз, ход вперёд
  (Object.keys(cooldowns) as CooldownKey[]).forEach((key) => {
    cooldowns[key] = Math.max(0, cooldowns[key] - 1);
  });
  if (statuses.aimDebuffTurns > 0) statuses.aimDebuffTurns -= 1;

  const turn = battle.turn + 1;

  return {
    ...state,
    battle: {
      ...battle,
      bossHp: bossHpAfter,
      damageDealt: battle.damageDealt + battle.bossHp - bossHpAfter,
      playerHp,
      log,
      turn,
      comboStreak: opts.streak,
      blocking: false,
      evading: false,
      cooldowns,
      statuses,
      weakPointTurns,
      lastHit: opts.lastHit ?? battle.lastHit ?? null,
      damageNumber: opts.lastHit
        ? { value: opts.lastHit.damage, x: 0, y: 0, crit: opts.lastHit.crit }
        : battle.damageNumber,
    },
  };
};

// Оглушение: действие тратится, ход отдаётся боссу.
export const stunnedRound = (state: GameState, battle: BattleState): GameState =>
  runRound(state, battle, {
    log: ['Вы оглушены и пропускаете ход'],
    bossDamage: 0,
    streak: 0,
    consumeStun: true,
    lastHit: null,
  });
