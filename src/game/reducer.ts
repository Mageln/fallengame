import { CLAN_CREATE_GOLD,
  CLAN_MAX_MEMBERS,
  CLAN_WAR_MIN_CONTRIB,
  CLAN_WAR_FULL_CONTRIB,
  CLAN_WAR_GOLD_BASE,
  CLAN_WAR_GOLD_LOSS,
  CLAN_WAR_CONTRIB_COST,
  CLAN_WAR_CONTRIB_SCORE,
  CLAN_WAR_HISTORY_LIMIT,
  DAILY_GOLD,
  DISTRICT_TASKS,
  DISTRICTS,
  LEVEL_GOLD,
  LOCATIONS,
  RAIDS,
  SHOP,
  SHELTER_ITEMS,
  getNextLockedRoom,
  getRoomSkin,
  TUTORIAL,
  WEAPON_BREAK_CHANCE,
  WEAPON_MAX_LEVEL,
  INVENTORY_ITEMS,
  CRAFTING_RECIPES,
  DAILY_QUESTS,
  normalizeWeapon,
  DEFAULT_STATS,
  // Боевая система (Блок 2)
  TURN_LIMIT,
  WEAK_POINT_STREAK,
  WEAK_POINT_TURNS,
  ENRAGE_THRESHOLD,
  STUN_CHANCE,
  POISON_CHANCE,
  POISON_TURNS,
  POISON_DAMAGE,
  BLOCK_COUNTER_MUL,
  EVADE_COUNTER_MUL,
  TECHNIQUE_MUL,
  TECHNIQUE_COOLDOWN,
  POWER_MUL,
  POWER_PIERCE,
  POWER_COOLDOWN,
  COMBO_HITS,
  COMBO_HIT_MUL,
  COMBO_COOLDOWN,
} from './constants';
import {
  canEnterDistrict,
  carUpgradeCost,
  dateKey,
  getDistrict,
  levelUpCost,
  luckUpgradeCost,
  lootDrop,
  staminaUpgradeCost,
  totalStamina,
  weaponRepairCost,
  weaponUpgradeCost,
  weaponUpgradeUpgradeCost,
  weekKey,
  // Боевая система (Блок 2)
  ammoCostOf,
  bossBaseDamage,
  comboMultiplier,
  computeDamage,
  counterDamage,
  durabilityLossOf,
  guaranteedCrit,
  maxDurabilityOf,
  medkitHeal,
  blockCounterChance,
  playerEvasion,
  resolveIncoming,
} from './formulas';
import { BOSSES } from './bosses';
import { BOSS_COUNTER_MS, BOSS_DURATION_MS, BOSS_SKILLS, DAILY_BOSS_ATTACKS, EXTRA_ATTACK_PRICE, RAID_DANGER_TASKS, RAID_TASK_GOLD_PRICE, roomDropChance, todayUtc } from './survival';
import type { ResourceEvent, ResourceSource } from './survival';
import { advanceClanContracts, clanRating, normalizeClanName, validateClanName, CLAN_EMBLEMS, CLAN_MEMBER_BONUS } from './clans';
import { BattleState, ClanState, ClanTaskEvent, ClanWarHistoryEntry, ClanWarState, GameAction, GameNotification, GameState } from './types';

const msg = (state: GameState, lastMessage: string): GameState => ({ ...state, lastMessage });

const recordResources = (state: GameState, source: ResourceSource, changes: Partial<Record<ResourceEvent['resource'], number>>): GameState => ({
  ...state,
  resourceEvents: [
    ...Object.entries(changes).filter(([, amount]) => amount && amount !== 0).map(([resource, amount]) => ({
      id: crypto.randomUUID(), at: Date.now(), source, resource: resource as ResourceEvent['resource'], amount: amount!,
    })),
    ...state.resourceEvents,
  ].slice(0, 80),
});

const resetBossAttacks = (state: GameState, now = Date.now()): GameState =>
  state.bossAttacks.date === todayUtc(now) ? state : { ...state, bossAttacks: { date: todayUtc(now), used: 0, purchased: 0 } };

const replaceClan = (state: GameState, clan: ClanState): GameState => ({
  ...state,
  clan: state.clan?.id === clan.id ? clan : state.clan,
  clanDirectory: state.clanDirectory.some((entry) => entry.id === clan.id)
    ? state.clanDirectory.map((entry) => entry.id === clan.id ? clan : entry)
    : [...state.clanDirectory, clan],
});

const syncClans = (state: GameState, directory: ClanState[]): GameState => {
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

const recordClanEvent = (state: GameState, event: ClanTaskEvent, amount = 1): GameState => {
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

const spend = (state: GameState, energy: number): GameState | null => {
  if (state.energy < energy) return null;
  return { ...state, energy: state.energy - energy };
};

const rollGast = (state: GameState): GameState => {
  const week = weekKey();
  if (state.gast.weekKey === week) return state;
  const active = Math.random() < 0.35;
  const pool = state.unlockedDistricts;
  const districtId = active && pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  return {
    ...state,
    gast: { weekKey: week, active, districtId },
  };
};

const applyDailyReset = (state: GameState): GameState => {
  const today = dateKey();
  let next: GameState = state;
  if (state.daily.dateKey !== today) {
    next = {
      ...next,
      daily: {
        dateKey: today,
        lotteryUsed: false,
        goldClaimed: false,
        quests: DAILY_QUESTS.map((q) => ({
          questId: q.id,
          progress: 0,
          completed: false,
          claimed: false,
        })),
      },
      // Вчерашняя война клана закрыта — сегодня жеребьёвка новой
      clanWar: null,
      lastMessage: 'Новый день в Эргейте. Заберите золото за вход и квесты обновлены.',
    };
  }
  next = withTodayWar(next);
  return rollGast(next);
};

// ── Клановые войны (ежедневные) ───────────────────────────────────────────────

// Генерация врага на основе рейтинга клана
const pickEnemyName = (rating: number): string => {
  const namePool = [
    'Дикари', 'Кровь', 'Рейдеры', 'Братство', 'Волки', 'Чистильщики',
    'Серп', 'Жнец', 'Бешеные', 'Корона', 'Молот', 'Тень', 'Орёл', 'Вепрь',
  ];
  const idx = Math.abs(rating * 7 + 13) % namePool.length;
  return namePool[idx];
};

const spawnClanWar = (state: GameState): ClanWarState => {
  const rating = state.clanRating;
  const enemyRating = Math.max(10, rating + Math.floor((Math.random() - 0.5) * 100));
  return {
    dateKey: dateKey(),
    enemyName: pickEnemyName(enemyRating),
    enemyRating,
    // Очки противника за день: база от рейтинга + небольшой разброс
    enemyScore: Math.round(enemyRating * 4 * (0.85 + Math.random() * 0.3)),
    contributions: 0,
    clanScore: 0,
    claimed: false,
    streak: state.clan?.warStreak ?? 0,
  };
};

// Гарантирует, что у игрока в клане есть сегодняшняя война (жеребьёвка при необходимости)
const withTodayWar = (state: GameState): GameState => {
  if (!state.clan) return state;
  if (state.clanWar && state.clanWar.dateKey === dateKey()) return state;
  return { ...state, clanWar: spawnClanWar(state) };
};

const clanWarContribute = (state: GameState, war: ClanWarState): GameState => {
  if (state.zhetons < CLAN_WAR_CONTRIB_COST) return msg(state, 'Нет жетонов для взноса.');
  if (war.contributions >= CLAN_WAR_FULL_CONTRIB) return msg(state, 'Максимальный вклад достигнут.');
  return {
    ...state,
    zhetons: state.zhetons - CLAN_WAR_CONTRIB_COST,
    clanWar: {
      ...war,
      contributions: war.contributions + 1,
      clanScore: war.clanScore + CLAN_WAR_CONTRIB_SCORE,
    },
    lastMessage: `Клановый взнос: +${CLAN_WAR_CONTRIB_SCORE} очков клана.`,
  };
};

const computeClanWarGold = (win: boolean, streak: number): number => {
  if (win) {
    return CLAN_WAR_GOLD_BASE + streak * 10;
  }
  return CLAN_WAR_GOLD_LOSS;
};

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
const normalizeBattle = (battle: BattleState): BattleState => ({
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
  skillReadyAt: battle.skillReadyAt ?? {},
  lastSkillId: battle.lastSkillId ?? null,
});

const startBattle = (
  state: GameState,
  bossId: string,
  bossName: string,
  bossHp: number,
  source: BattleState['source'],
  bossMaxHp = bossHp
): GameState => {
  if (state.battle) return { ...state, battleVisible: true, lastMessage: 'Продолжается текущий бой.' };
  const current = resetBossAttacks(state);
  if (source === 'boss' && current.bossAttacks.used >= DAILY_BOSS_ATTACKS + current.bossAttacks.purchased) {
    return msg(current, 'ЛИМИТ ИСЧЕРПАН. Следующие бесплатные атаки — завтра (UTC).');
  }
  if (state.weapon.broken) return msg(current, 'Оружие сломано. Почините его в Мастерской.');
  if (current.health <= 0) return msg(current, 'Сначала восстановите HP в рейдовых заданиях.');
  const hp = totalStamina(current);
  const limit = TURN_LIMIT[source];
  const now = Date.now();
  return {
    ...current,
    bossAttacks: source === 'boss' ? { ...current.bossAttacks, used: current.bossAttacks.used + 1 } : current.bossAttacks,
    battleVisible: true,
    showBossModal: false,
    battle: {
      bossId,
      bossName,
      bossHp,
      bossMaxHp,
      playerHp: Math.min(hp, current.health),
      playerMaxHp: hp,
      log: [`Бой: ${bossName}. Лимит — ${limit} ходов.`],
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
      skillReadyAt: {},
      lastSkillId: null,
    },
  };
};

// Расход боеприпасов. Если патронов не хватает — стреляем прикладом (DRY_FIRE_MUL).
const spendAmmo = (state: GameState, hits: number): { state: GameState; dryFire: boolean } => {
  const cost = ammoCostOf(state.weapon) * hits;
  if (cost <= 0) return { state, dryFire: false };
  if (state.bullets >= cost) {
    return { state: { ...state, bullets: state.bullets - cost }, dryFire: false };
  }
  return { state, dryFire: true };
};

// Износ прочности: при нуле оружие разваливается, при износе <25% есть шанс поломки.
const wearWeapon = (state: GameState, hits: number): { state: GameState; broke: boolean } => {
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
const bumpKillQuests = (state: GameState): GameState => ({
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

const bossKilled = (state: GameState, battle: BattleState): GameState => {
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
    health: Math.max(0, Math.min(state.maxHealth, battle.playerHp)),
    battle: {
      ...battle,
      bossHp: 0,
      outcome: 'won',
      endedAt: Date.now(),
      reward: {
        bullets: bossReward?.bullets ?? bullets,
        keys: bossReward ? 1 : (battle.source === 'gast' ? 0 : 1),
        zhetons: battle.source === 'boss' ? 0 : zhetons,
        gold: bossReward?.gold ?? gold,
        room: dropped ? candidate : null,
        roomChance: chance,
        dropped,
      },
      log: [...battle.log, `${battle.bossName} повержен! Забирайте награду.`],
    },
    lastMessage: `${battle.bossName} повержен! ${dropped ? 'ВЫПАЛО: найдена комната!' : 'НЕ ВЫПАЛО'} (${Math.round(chance * 100)}%).`,
  };
};

const playerDefeated = (state: GameState, battle: BattleState): GameState => ({
  ...state,
  health: 0,
  battle: {
    ...battle,
    outcome: 'lost',
    endedAt: Date.now(),
    log: [...battle.log, 'Вы выбыли из боя.'],
  },
  lastMessage: 'Вы выбыли из боя. Нужны аптечки и выносливость.',
});

const advanceBossClock = (state: GameState, now: number): GameState => {
  if (!state.battle || state.battle.source !== 'boss' || state.battle.outcome !== 'fighting') return state;
  const battle = normalizeBattle(state.battle);
  const until = Math.min(now, battle.endsAt);
  const strikes = Math.max(0, Math.floor((until - battle.lastCounterAt) / BOSS_COUNTER_MS));
  let playerHp = battle.playerHp;
  if (strikes > 0) {
    const perStrike = Math.max(2, Math.floor(bossBaseDamage(battle.bossMaxHp) / 2));
    playerHp = Math.max(0, playerHp - strikes * perStrike + (battle.blocking ? Math.floor(perStrike * 0.6) : 0));
  }
  const next = {
    ...battle,
    playerHp,
    blocking: strikes > 0 ? false : battle.blocking,
    lastCounterAt: battle.lastCounterAt + strikes * BOSS_COUNTER_MS,
    log: strikes > 0 ? [...battle.log, `${battle.bossName}: ${strikes} ответных ударов в фоне.`].slice(-15) : battle.log,
  };
  if (playerHp <= 0) return playerDefeated(state, next);
  if (now >= battle.endsAt) return {
    ...state,
    health: Math.min(state.maxHealth, playerHp),
    battle: { ...next, outcome: 'lost', endedAt: battle.endsAt, log: [...next.log, 'Время вышло. Босс ушёл в темноту.'] },
    lastMessage: 'Время боя вышло. Урон боссу сохранён.',
  };
  return strikes > 0 ? { ...state, health: Math.min(state.maxHealth, playerHp), battle: next } : state;
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
const runRound = (state: GameState, battle: BattleState, opts: RoundOptions): GameState => {
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

  let playerHp = Math.max(0, battle.playerHp - incoming.damage);
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
    log.push(`Аптечка: +${playerHp - before} HP`);
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
    playerHp = Math.max(0, playerHp - statuses.poisonDamage);
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

  // 6) Поражение игрока
  if (playerHp <= 0) return playerDefeated(state, { ...battle, bossHp: bossHpAfter, damageDealt: battle.damageDealt + battle.bossHp - bossHpAfter, playerHp: 0, log });

  // 7) Конец раунда: таймеры вниз, ход вперёд
  (Object.keys(cooldowns) as CooldownKey[]).forEach((key) => {
    cooldowns[key] = Math.max(0, cooldowns[key] - 1);
  });
  if (statuses.aimDebuffTurns > 0) statuses.aimDebuffTurns -= 1;

  const turn = battle.turn + 1;
  if (turn > battle.turnLimit) {
    return {
      ...state,
      battle: null,
      battleVisible: false,
      health: Math.min(state.maxHealth, playerHp),
      woundedBosses: battle.source === 'boss'
        ? { ...state.woundedBosses, [battle.bossId]: bossHpAfter }
        : state.woundedBosses,
      lastMessage: `${battle.bossName} уходит в темноту. Лимит ${battle.turnLimit} ходов исчерпан — бой не завершён.`,
    };
  }

  return {
    ...state,
    health: Math.min(state.maxHealth, playerHp),
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
const stunnedRound = (state: GameState, battle: BattleState): GameState =>
  runRound(state, battle, {
    log: ['Вы оглушены и пропускаете ход'],
    bossDamage: 0,
    streak: 0,
    consumeStun: true,
    lastHit: null,
  });

export const hydrateState = (state: GameState): GameState => {
  // Normalize old saves that may lack new fields
  let normalized: GameState = { ...state };
  
  if (!normalized.inventory) {
    normalized = { ...normalized, inventory: [] };
  }
  if (!normalized.craftingRecipes) {
    normalized = { ...normalized, craftingRecipes: ['repair_kit', 'medkit_bundle'] };
  }
  if (!normalized.daily?.quests) {
    normalized = {
      ...normalized,
      daily: {
        ...normalized.daily,
        quests: DAILY_QUESTS.map((q) => ({
          questId: q.id,
          progress: 0,
          completed: false,
          claimed: false,
        })),
      },
    };
  }
  // Оружие в старых сохранениях содержало только name/level/broken/baseDamage/upgraded.
  // Приводим к полному Weapon: недостающие поля (тип, точность, прочность, моды)
  // заполняются значениями по умолчанию, уже прокачанные — сохраняются.
  if (normalized.weapon) {
    normalized = { ...normalized, weapon: normalizeWeapon(normalized.weapon) };
  }
  if (typeof normalized.soundEnabled === 'undefined') {
    normalized = { ...normalized, soundEnabled: true };
  }
  // Атрибуты персонажа появились вместе с новой боевой системой.
  if (!normalized.attributes) {
    normalized = { ...normalized, attributes: { ...DEFAULT_STATS } };
  } else {
    // Дозаполняем отдельные атрибуты, если сохранение было из промежуточной версии
    normalized = {
      ...normalized,
      attributes: { ...DEFAULT_STATS, ...normalized.attributes },
    };
  }
  if (!Array.isArray(normalized.notifications)) {
    normalized = { ...normalized, notifications: [] };
  }
  if (typeof normalized.showNotifications === 'undefined') {
    normalized = { ...normalized, showNotifications: false };
  }
  if (typeof normalized.activeRaidId === 'undefined') {
    normalized = { ...normalized, activeRaidId: null };
  }
  if (typeof normalized.showClanModal === 'undefined') {
    normalized = { ...normalized, showClanModal: false };
  }
  // Раненые боссы появились вместе с унификацией боя (Этап 1)
  if (!normalized.woundedBosses || typeof normalized.woundedBosses !== 'object') {
    normalized = { ...normalized, woundedBosses: {} };
  }
  // DEV: поднять игрока до 30 уровня (нужно для входа в клан с 20 ур.)
  // После первого применения уровень >= 30 и миграция больше не сработает.
  if (typeof normalized.level === 'number' && normalized.level < 30) {
    normalized = { ...normalized, level: 30 };
  }
  // Миграция клановых полей (Блок 6)
  if (typeof normalized.clanRating === 'undefined') {
    normalized = { ...normalized, clanRating: 0 };
  }
  if (!normalized.clanWarHistory) {
    normalized = { ...normalized, clanWarHistory: [] };
  }
  if (!Array.isArray(normalized.unlockedRooms)) {
    // Старые сохранения не отслеживали доступ к комнатам: оставляем текущую комнату.
    const previousRoom = LOCATIONS.some((room) => room.id === normalized.currentLocation)
      ? normalized.currentLocation
      : 'location1';
    normalized = { ...normalized, unlockedRooms: [...new Set(['location1', previousRoom])] };
  }
  if (!LOCATIONS.some((room) => room.id === normalized.currentLocation)) {
    normalized = { ...normalized, currentLocation: 'location1' };
  }
  if (typeof normalized.clanWar === 'undefined') {
    normalized = { ...normalized, clanWar: null };
  }
  normalized = {
    ...normalized,
    playerId: normalized.playerId ?? 'local',
    playerName: normalized.playerName ?? 'Выживший',
    pendingClanId: normalized.pendingClanId ?? null,
    clanDirectory: Array.isArray(normalized.clanDirectory) ? normalized.clanDirectory : [],
  };
  if (normalized.clan) {
    const old = normalized.clan;
    const createdAt = old.createdAt ?? Date.now();
    const leaderId = old.leaderId ?? normalized.playerId;
    const members = Array.isArray(old.members) ? old.members : [
      { id: normalized.playerId, name: normalized.playerName, role: 'leader' as const, joinedAt: createdAt },
      ...Array.from({ length: Math.max(0, Math.min(CLAN_MAX_MEMBERS, Number(old.members) || 1) - 1) }, (_, index) => ({
        id: `archive-${index}`, name: `Выживший ${index + 1}`, role: 'member' as const, joinedAt: createdAt,
      })),
    ];
    const clan: ClanState = {
      ...old,
      id: old.id ?? `legacy-${normalized.playerId}`,
      name: old.name ?? 'Убежище',
      emblem: CLAN_EMBLEMS.some((entry) => entry.id === old.emblem) ? old.emblem : 'skull',
      description: old.description ?? 'Старое убежище Эргейта.',
      leaderId,
      members,
      applications: Array.isArray(old.applications) ? old.applications : [],
      createdAt,
      taskPoints: old.taskPoints ?? 0,
      taskProgress: old.taskProgress ?? {},
      rating: 0,
      score: old.score ?? 0,
      warRating: old.warRating ?? 0,
      warWins: old.warWins ?? 0,
      warLosses: old.warLosses ?? 0,
      warStreak: old.warStreak ?? 0,
    };
    clan.rating = clanRating(clan);
    const sharedClan = normalized.clanDirectory.find((entry) => entry.id === clan.id);
    normalized = {
      ...normalized,
      clan: sharedClan ?? clan,
      clanDirectory: sharedClan ? normalized.clanDirectory : [...normalized.clanDirectory, clan],
    };
  }

  // Миграция убежища (комнаты): донатная валюта «Крышки» и оформления.
  if (typeof normalized.caps !== 'number') normalized = { ...normalized, caps: 0 };
  if (typeof normalized.shelterBed !== 'boolean') normalized = { ...normalized, shelterBed: false };
  if (typeof normalized.shelterGenerator !== 'boolean') normalized = { ...normalized, shelterGenerator: false };
  if (typeof normalized.shelterKit !== 'boolean') normalized = { ...normalized, shelterKit: false };
  if (!Array.isArray(normalized.ownedSkins)) normalized = { ...normalized, ownedSkins: [] };
  if (!normalized.selectedSkins || typeof normalized.selectedSkins !== 'object' || Array.isArray(normalized.selectedSkins)) {
    normalized = { ...normalized, selectedSkins: {} };
  }
  normalized = {
    ...normalized,
    premiumGold: Number.isFinite(normalized.premiumGold) ? Math.max(0, normalized.premiumGold) : 0,
    maxHealth: Number.isFinite(normalized.maxHealth) && normalized.maxHealth > 0 ? normalized.maxHealth : 100,
    health: Number.isFinite(normalized.health) ? Math.max(0, normalized.health) : 100,
    battleVisible: normalized.battle ? (normalized.battleVisible ?? true) : false,
    battle: normalized.battle ? normalizeBattle(normalized.battle) : null,
    bossAttacks: normalized.bossAttacks ?? { date: todayUtc(), used: normalized.battle ? 1 : 0, purchased: 0 },
    lastRoomRoll: normalized.lastRoomRoll ?? null,
    pendingRoomDrop: normalized.pendingRoomDrop ?? null,
    raidTasks: normalized.raidTasks ?? null,
    raidTaskProgress: normalized.raidTaskProgress ?? (normalized.raidTasks ? { [normalized.raidTasks.raidId]: normalized.raidTasks.completedIds } : {}),
    resourceEvents: Array.isArray(normalized.resourceEvents) ? normalized.resourceEvents : [],
  };

  return advanceBossClock(resetBossAttacks(applyDailyReset(syncClans(normalized, normalized.clanDirectory))), Date.now());
};

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  // Босс на отдельной арене: старые кнопки пошагового боя не обходят его кулдауны.
  if (state.battle?.source === 'boss' && (action.type.startsWith('BATTLE_') || action.type === 'INVITE_FRIEND')) return state;
  switch (action.type) {
    case 'HYDRATE_STATE':
      // Загрузка сохранения конкретного пользователя (после определения его VK ID)
      return hydrateState({
        ...action.state,
        showBossModal: false,
        showMap: false,
        showRaidModal: false,
        activeRaidId: null,
        showNotifications: false,
      });
    case 'ADD_RESOURCE': {
      // Пополнение ресурса кнопкой "+" в панели ресурсов
      const amount = Math.max(0, Math.floor(action.amount));
      if (amount === 0) return state;
      switch (action.resource) {
        case 'energy':
          return { ...state, energy: Math.min(state.maxEnergy, state.energy + amount), lastMessage: `+${amount} энергии` };
        case 'bullets':
          return { ...state, bullets: state.bullets + amount, lastMessage: `+${amount} патронов` };
        case 'gold':
          return { ...state, gold: state.gold + amount, lastMessage: `+${amount} золота` };
        case 'matches':
          return { ...state, matches: state.matches + amount, lastMessage: `+${amount} спичек` };
        case 'zhetons':
          return { ...state, zhetons: state.zhetons + amount, lastMessage: `+${amount} жетонов` };
        default:
          return state;
      }
    }
    case 'CLEAR_MESSAGE':
      return { ...state, lastMessage: '' };
    case 'SET_APPEARANCE':
      return { ...state, appearance: action.appearance };
    case 'NEXT_TUTORIAL': {
      const next = state.tutorialStep + 1;
      if (next >= TUTORIAL.length) {
        return { ...state, tutorialStep: -1, lastMessage: 'Обучение завершено. Качайте машину и открывайте районы.' };
      }
      return { ...state, tutorialStep: next, lastMessage: TUTORIAL[next] };
    }
    case 'SKIP_TUTORIAL':
      return { ...state, tutorialStep: -1 };
    case 'RESTORE_ENERGY_TICK':
      if (state.energy >= state.maxEnergy) return state;
      return { ...state, energy: Math.min(state.maxEnergy, state.energy + 1) };
    case 'CLAIM_DAILY': {
      if (state.daily.goldClaimed) return msg(state, 'Золото за сегодня уже получено.');
      return {
        ...state,
        gold: state.gold + DAILY_GOLD,
        daily: { ...state.daily, goldClaimed: true },
        lastMessage: `Ежедневный вход: +${DAILY_GOLD} золота.`,
      };
    }
    case 'UPGRADE_LEVEL': {
      const cost = levelUpCost(state.level);
      if (state.bullets < cost) return msg(state, `Нужно ${cost} патронов на уровень.`);
      return {
        ...state,
        bullets: state.bullets - cost,
        level: state.level + 1,
        gold: state.gold + LEVEL_GOLD,
        lastMessage: `Уровень ${state.level + 1}. +${LEVEL_GOLD} золота.`,
      };
    }
    case 'UPGRADE_STAMINA': {
      const cost = staminaUpgradeCost(state.baseStamina);
      if (state.bullets < cost) return msg(state, `Нужно ${cost} патронов. Цена считается от базовой выносливости.`);
      return {
        ...state,
        bullets: state.bullets - cost,
        baseStamina: state.baseStamina + 5,
        lastMessage: `Базовая выносливость ${state.baseStamina + 5}. Бонусы с вещей цену не поднимают.`,
      };
    }
    case 'UPGRADE_LUCK': {
      const cost = luckUpgradeCost(state.luck);
      if (state.bullets < cost) return msg(state, `Нужно ${cost} патронов на удачу.`);
      return {
        ...state,
        bullets: state.bullets - cost,
        luck: state.luck + 15,
        lastMessage: `Удача ${state.luck + 15}. Для частого крита целитесь в 1100–1200.`,
      };
    }
    case 'UPGRADE_CAR': {
      const cost = carUpgradeCost(state.carLevel);
      if (state.energy < cost.energy) return msg(state, `Машине нужно ${cost.energy} энергии.`);
      if (state.matches < cost.matches) return msg(state, `Машине нужно ${cost.matches} спичек.`);
      const carLevel = state.carLevel + 1;
      const newly = DISTRICTS.filter(
        (d) => d.carLevel <= carLevel && !state.unlockedDistricts.includes(d.id)
      ).map((d) => d.id);
      let result = {
        ...state,
        energy: state.energy - cost.energy,
        matches: state.matches - cost.matches,
        carLevel,
        unlockedDistricts: [...state.unlockedDistricts, ...newly],
        lastMessage:
          newly.length > 0
            ? `Машина ${carLevel}. Открыто: ${newly.map((id) => getDistrict(id)?.name).join(', ')}.`
            : `Машина ${carLevel}. Нортед откроется на 50, дальше — на 70.`,
      };
      // Update quest progress for upgrade_car
      const carQuest = result.daily.quests.find((qp) => qp.questId === 'q4');
      if (carQuest && !carQuest.completed && !carQuest.claimed) {
        const quest = DAILY_QUESTS.find((q) => q.id === 'q4');
        const newProgress = Math.min(quest?.target ?? Infinity, carQuest.progress + 1);
        result = {
          ...result,
          daily: {
            ...result.daily,
            quests: result.daily.quests.map((qp) =>
              qp.questId === 'q4' ? { ...qp, progress: newProgress, completed: newProgress >= (quest?.target ?? 0) } : qp
            ),
          },
        };
      }
      return result;
    }
    case 'ENTER_DISTRICT': {
      if (!canEnterDistrict(state, action.districtId)) {
        const d = getDistrict(action.districtId);
        return msg(state, `Нужна машина ${d?.carLevel ?? '?'}. Сначала качайте авто.`);
      }
      const district = getDistrict(action.districtId);
      if (!district) return state;
      const firstVisit = !state.unlockedDistricts.includes(action.districtId);
      if (firstVisit) {
        const next = spend(state, district.energyCost);
        if (!next) return msg(state, `Нужно ${district.energyCost} энергии, чтобы открыть район.`);
        return {
          ...next,
          currentDistrict: action.districtId,
          unlockedDistricts: [...state.unlockedDistricts, action.districtId],
          lastMessage: `Район ${district.name} открыт.`,
        };
      }
      return { ...state, currentDistrict: action.districtId };
    }
    case 'DO_TASK': {
      const tasks = DISTRICT_TASKS[state.currentDistrict] ?? DISTRICT_TASKS.southgate;
      const task = tasks.find((t) => t.id === action.taskId);
      if (!task) return state;
      const next = spend(state, task.cost);
      if (!next) return msg(state, 'Не хватает энергии на задание.');
      let result = {
        ...next,
        zhetons: next.zhetons + 1,
        lastMessage: `${task.name}: +1 жетон 🎟️ (соло-задание).`,
      };
      // Update quest progress for do_task
      const taskQuest = result.daily.quests.find((qp) => qp.questId === 'q2' || qp.questId === 'q7');
      if (taskQuest && !taskQuest.completed && !taskQuest.claimed) {
        const quest = DAILY_QUESTS.find((q) => q.id === taskQuest.questId);
        const newProgress = Math.min(quest?.target ?? Infinity, taskQuest.progress + 1);
        result = {
          ...result,
          daily: {
            ...result.daily,
            quests: result.daily.quests.map((qp) =>
              qp.questId === taskQuest.questId ? { ...qp, progress: newProgress, completed: newProgress >= (quest?.target ?? 0) } : qp
            ),
          },
        };
      }
      return recordResources(result, 'solo-task', { tokens: 1 });
    }
    case 'BUY_EQUIPMENT': {
      if (state.equipmentIds.includes(action.itemId)) return msg(state, 'Уже надето.');
      const item = SHOP.find((s) => s.id === action.itemId);
      if (!item) return state;
      if (state.bullets < item.costBullets) return msg(state, `Нужно ${item.costBullets} патронов.`);
      return {
        ...state,
        bullets: state.bullets - item.costBullets,
        equipmentIds: [...state.equipmentIds, item.id],
        lastMessage: `${item.name} надето. Сравнивайте цену/бонус с прокачкой в профиле.`,
      };
    }
    case 'UPGRADE_WEAPON': {
      if (state.weapon.level >= WEAPON_MAX_LEVEL) return msg(state, 'Заточка уже 10.');
      if (state.weapon.broken) return msg(state, 'Сначала почините оружие.');
      const cost = weaponUpgradeCost(state.weapon.level);
      if (state.bullets < cost) return msg(state, `Нужно ${cost} патронов.`);
      const level = state.weapon.level + 1;
      return {
        ...state,
        bullets: state.bullets - cost,
        weapon: { ...state.weapon, level },
        lastMessage: `Оружие +${level}. +3 урона, открыта модернизация.`,
      };
    }
    case 'UPGRADE_WEAPON_UPGRADE': {
      if (!state.weapon.upgraded) return msg(state, 'Модернизация уже доступна.');
      if (state.weapon.broken) return msg(state, 'Сначала почините оружие.');
      if (state.bullets < weaponUpgradeUpgradeCost()) return msg(state, `Модернизация: ${weaponUpgradeUpgradeCost()} патронов.`);
      return {
        ...state,
        bullets: state.bullets - weaponUpgradeUpgradeCost(),
        weapon: { ...state.weapon, upgraded: true },
        lastMessage: 'Оружие модернизировано! +5 урона.',
      };
    }
    case 'REPAIR_WEAPON': {
      if (!state.weapon.broken) return msg(state, 'Оружие целое.');
      const cost = weaponRepairCost();
      if (state.matches < cost) return msg(state, `Ремонт: ${cost} спичек.`);
      return {
        ...state,
        matches: state.matches - cost,
        weapon: { ...state.weapon, broken: false },
        lastMessage: 'Оружие починено, урон снова считается.',
      };
    }
    case 'START_BOSS': {
      const district = getDistrict(action.districtId);
      if (!district) return state;
      if (!canEnterDistrict(state, district.id)) {
        return msg(state, 'Район закрыт. Качайте машину.');
      }
      return startBattle(state, district.bossId, district.bossName, district.bossHp, 'district');
    }
    case 'START_BOSS_FIGHT': {
      const boss = BOSSES.find((b) => b.id === action.bossId);
      if (!boss) return state;
      if (state.battle && state.battle.bossId === action.bossId)
        return { ...advanceBossClock(state, Date.now()), battleVisible: true };
      // Босс может остаться раненым после прошлой попытки
      const wounded = state.woundedBosses[action.bossId];
      const hp = wounded && wounded > 0 && wounded <= boss.hp ? wounded : boss.hp;
      return startBattle(state, action.bossId, boss.name, hp, 'boss', boss.hp);
    }
    case 'START_GAST': {
      if (!state.gast.active || !state.gast.districtId) {
        return msg(state, 'Гаст сейчас не появился. Он ходит 1–2 раза в неделю.');
      }
      return startBattle(state, 'gast', 'Гаст', 900, 'gast');
    }
    case 'OPEN_BATTLE': {
      const next = advanceBossClock(state, Date.now());
      return next.battle ? { ...next, battleVisible: true, showBossModal: false } : msg(next, 'Активного боя нет.');
    }
    case 'BOSS_TICK':
      return advanceBossClock(resetBossAttacks(state, action.now), action.now);
    case 'BUY_BOSS_ATTACK': {
      const current = resetBossAttacks(state);
      if (current.bossAttacks.used < DAILY_BOSS_ATTACKS + current.bossAttacks.purchased) return msg(current, 'Сначала используйте доступные атаки.');
      if (current.premiumGold < EXTRA_ATTACK_PRICE) return msg(current, 'Недостаточно премиум-золота 🪙.');
      return recordResources({
        ...current,
        premiumGold: current.premiumGold - EXTRA_ATTACK_PRICE,
        bossAttacks: { ...current.bossAttacks, purchased: current.bossAttacks.purchased + 1 },
        lastMessage: 'Дополнительная атака доступна сегодня.',
      }, 'shop', { premiumGold: -EXTRA_ATTACK_PRICE });
    }
    case 'CLAIM_ROOM': {
      const drop = state.pendingRoomDrop;
      if (!drop?.dropped || !drop.roomId) return state;
      const room = LOCATIONS.find((entry) => entry.id === drop.roomId);
      if (!room) return msg(state, 'Комната не найдена.');
      return { ...state, pendingRoomDrop: null,
        unlockedRooms: state.unlockedRooms.includes(room.id) ? state.unlockedRooms : [...state.unlockedRooms, room.id],
        lastMessage: `ВЫПАЛО! Комната «${room.name}» получена.`,
      };
    }
    case 'BOSS_SKILL': {
      if (!Number.isFinite(action.now)) return state;
      const current = advanceBossClock(state, action.now);
      if (!current.battle || current.battle.source !== 'boss' || current.battle.outcome !== 'fighting') return current;
      const skill = BOSS_SKILLS.find((entry) => entry.id === action.skillId);
      if (!skill) return current;
      const battle = current.battle;
      if ((battle.skillReadyAt[skill.id] ?? 0) > action.now) return msg(current, `${skill.name}: приём ещё не готов.`);
      if (current.bullets < skill.ammo) return msg(current, `Для «${skill.name}» нужно ${skill.ammo} пули.`);
      const damage = Math.min(battle.bossHp, Math.max(1, Math.round((8 + current.level / 4) * skill.multiplier)));
      const updated: BattleState = {
        ...battle,
        bossHp: battle.bossHp - damage,
        damageDealt: battle.damageDealt + damage,
        comboStreak: battle.comboStreak + 1,
        turn: battle.turn + 1,
        blocking: skill.id === 'guard',
        lastHit: { damage, crit: skill.id === 'critical', missed: false },
        lastSkillId: skill.id,
        skillReadyAt: { ...battle.skillReadyAt, [skill.id]: action.now + skill.cooldown * 2_000 },
        log: [...battle.log, `${skill.icon} ${skill.name}: −${damage} HP`].slice(-15),
      };
      const spent = { ...current, bullets: current.bullets - skill.ammo };
      return updated.bossHp <= 0
        ? bossKilled(spent, updated)
        : { ...spent, battle: updated, lastMessage: `${skill.name}: −${damage} HP. Шанс комнаты: ${Math.round(roomDropChance(updated.damageDealt) * 100)}%.` };
    }
    case 'BATTLE_ATTACK': {
      if (!state.battle || state.battle.outcome !== 'fighting') return state;
      const battle = normalizeBattle(state.battle);
      if (battle.statuses.stunTurns > 0) return stunnedRound(state, battle);

      // Техника — точный приём с кулдауном. Без неё это обычный удар за 1 патрон.
      const isTech = action.technique;
      if (isTech && battle.cooldowns.technique > 0) {
        return msg({ ...state, battle }, `Приём ещё не готов: ${battle.cooldowns.technique} ход.`);
      }

      const { state: s1, dryFire } = spendAmmo(state, 1);
      const { state: s2, broke } = wearWeapon(s1, 1);
      const hit = computeDamage(s2, {
        techniqueMul: isTech ? TECHNIQUE_MUL : 1,
        streakMul: comboMultiplier(battle.comboStreak),
        weakPoint: battle.weakPointTurns > 0,
        dryFire,
        forceCrit: guaranteedCrit(battle.comboStreak),
      });

      const log = [
        hit.missed
          ? `${isTech ? 'Приём' : 'Удар'} — мимо`
          : `${isTech ? 'Приём' : 'Удар'}: ${hit.damage}${hit.crit ? ' (крит)' : ''}`,
      ];
      if (dryFire) log.push('Патроны кончились — бьёте прикладом');
      if (broke) log.push('Оружие сломалось');
      if (battle.weakPointTurns > 0 && !hit.missed) log.push('Слабое место!');

      return runRound(s2, battle, {
        log,
        bossDamage: hit.damage,
        streak: hit.missed ? 0 : battle.comboStreak + 1,
        lastHit: { damage: hit.damage, crit: hit.crit, missed: hit.missed },
        setCooldown: isTech ? { key: 'technique', turns: TECHNIQUE_COOLDOWN } : undefined,
      });
    }
    case 'BATTLE_GRENADES': {
      if (!state.battle || state.battle.outcome !== 'fighting') return state;
      if (!Number.isInteger(action.count) || action.count < 1 || state.grenades < action.count) {
        return msg(state, 'Не хватает гранат.');
      }
      const battle = normalizeBattle(state.battle);
      if (battle.statuses.stunTurns > 0) return stunnedRound(state, battle);
      const { state: s1, broke } = wearWeapon({ ...state, grenades: state.grenades - action.count }, action.count);
      const s2 = spendAmmo(s1, 0).state;
      const hit = computeDamage(s2, {
        techniqueMul: 1,
        streakMul: comboMultiplier(battle.comboStreak),
        weakPoint: battle.weakPointTurns > 0,
        forceCrit: guaranteedCrit(battle.comboStreak),
      });
      const total = hit.missed ? 0 : action.count * 12;
      const log = hit.missed
        ? ['Гранаты — мимо!']
        : [`Гранаты x${action.count}: ${total} урона`];
      if (broke) log.push('Оружие не выдержало');
      return runRound(s2, battle, {
        log,
        bossDamage: total,
        streak: hit.missed ? 0 : battle.comboStreak + 1,
        lastHit: { damage: total, crit: hit.crit, missed: hit.missed },
      });
    }
    case 'BATTLE_HEAL': {
      if (!state.battle || state.battle.outcome !== 'fighting') return state;
      if (state.medkits <= 0) return msg(state, 'Нет аптечек.');
      const battle = normalizeBattle(state.battle);
      if (battle.statuses.stunTurns > 0) return stunnedRound(state, battle);
      return runRound({ ...state, medkits: state.medkits - 1 }, battle, {
        log: [], // текст лечения добавляет runRound
        bossDamage: 0,
        streak: battle.comboStreak,
        heal: medkitHeal(state),
        curePoison: battle.statuses.poisonTurns > 0,
      });
    }
    // Мощный удар: x1.6 урона, игнорирует половину брони, долгий кулдаун
    case 'BATTLE_POWER': {
      if (!state.battle || state.battle.outcome !== 'fighting') return state;
      const battle = normalizeBattle(state.battle);
      if (battle.statuses.stunTurns > 0) return stunnedRound(state, battle);
      if (battle.cooldowns.power > 0)
        return msg({ ...state, battle }, `Мощный удар ещё не готов: ${battle.cooldowns.power} ход.`);
      const { state: s1, dryFire } = spendAmmo(state, 1);
      const { state: s2, broke } = wearWeapon(s1, 1);
      const hit = computeDamage(s2, {
        techniqueMul: POWER_MUL,
        pierce: POWER_PIERCE,
        streakMul: comboMultiplier(battle.comboStreak),
        weakPoint: battle.weakPointTurns > 0,
        dryFire,
        forceCrit: guaranteedCrit(battle.comboStreak),
      });
      const log = [hit.missed ? 'Мимо — броня сыграла роль' : `Мощный удар: ${hit.damage}${hit.crit ? ' (крит)' : ''}`];
      if (broke) log.push('Оружие не выдержало — сломалось');
      return runRound(s2, battle, {
        log,
        bossDamage: hit.damage,
        streak: hit.missed ? 0 : battle.comboStreak + 1,
        lastHit: { damage: hit.damage, crit: hit.crit, missed: hit.missed },
        setCooldown: { key: 'power', turns: POWER_COOLDOWN },
      });
    }
    // Серия: три удара по 70%, суммарно больше, но каждый может промахнуться
    case 'BATTLE_COMBO': {
      if (!state.battle || state.battle.outcome !== 'fighting') return state;
      const battle = normalizeBattle(state.battle);
      if (battle.statuses.stunTurns > 0) return stunnedRound(state, battle);
      if (battle.cooldowns.combo > 0)
        return msg({ ...state, battle }, `Серия ещё не готова: ${battle.cooldowns.combo} ход.`);
      const { state: s1, dryFire } = spendAmmo(state, COMBO_HITS);
      const { state: s2, broke } = wearWeapon(s1, COMBO_HITS);
      const hits = Array.from({ length: COMBO_HITS }, () =>
        computeDamage(s2, {
          comboMul: COMBO_HIT_MUL,
          streakMul: comboMultiplier(battle.comboStreak),
          weakPoint: battle.weakPointTurns > 0,
          dryFire,
          forceCrit: guaranteedCrit(battle.comboStreak),
        })
      );
      const landed = hits.filter((h) => !h.missed);
      const total = landed.reduce((sum, h) => sum + h.damage, 0);
      const log = [`Серия: ${landed.length}/${COMBO_HITS} попали, ${total} урона`];
      if (broke) log.push('Оружие развалилось на последней атаке');
      return runRound(s2, battle, {
        log,
        bossDamage: total,
        streak: landed.length === COMBO_HITS ? battle.comboStreak + COMBO_HITS : landed.length,
        lastHit: { damage: total, crit: landed.some((h) => h.crit), missed: landed.length === 0 },
        setCooldown: { key: 'combo', turns: COMBO_COOLDOWN },
      });
    }
    // Блок: входящий урон x0.4, шанс контратаки, серия сохраняется
    case 'BATTLE_BLOCK': {
      if (!state.battle || state.battle.outcome !== 'fighting') return state;
      const battle = normalizeBattle(state.battle);
      if (battle.statuses.stunTurns > 0) return stunnedRound(state, battle);
      return runRound(state, battle, {
        log: ['Вы поднимаете защиту'],
        bossDamage: 0,
        streak: battle.comboStreak,
        blocking: true,
      });
    }
    // Уклонение: следующий удар босса игнорируется + ответный удар
    case 'BATTLE_EVADE': {
      if (!state.battle || state.battle.outcome !== 'fighting') return state;
      const battle = normalizeBattle(state.battle);
      if (battle.statuses.stunTurns > 0) return stunnedRound(state, battle);
      if (battle.cooldowns.evade > 0)
        return msg({ ...state, battle }, `Уклонение ещё не готово: ${battle.cooldowns.evade} ход.`);
      return runRound(state, battle, {
        log: ['Вы готовитесь уйти от удара'],
        bossDamage: 0,
        streak: battle.comboStreak,
        evading: true,
        setCooldown: { key: 'evade', turns: 2 },
      });
    }
    case 'INVITE_FRIEND': {
      if (!state.battle) return state;
      if (state.battle.friends.length >= 4) return msg(state, 'Лимит помощи в этом бою.');
      const name = `Друг ${state.battle.friends.length + 1}`;
      return {
        ...state,
        battle: {
          ...state.battle,
          friends: [...state.battle.friends, name],
          bossHp: Math.max(0, state.battle.bossHp - 40),
          log: [...state.battle.log, `${name} вошёл в бой (−40 HP)`],
        },
        lastMessage: 'Позвать друзей: союзник нанёс урон боссу.',
      };
    }
    case 'LEAVE_BATTLE': {
      if (!state.battle) return state;
      const battle = state.battle;
      if (battle.source === 'boss' && battle.outcome === 'fighting') {
        return { ...state, battleVisible: false, showBossModal: false, lastMessage: 'Вышли из боя. Таймер и атаки босса продолжаются.' };
      }
      if (battle.outcome === 'won') {
        const r = battle.reward;
        // Победа: очистка раненого HP (если оно было)
        const wb = { ...state.woundedBosses };
        delete wb[battle.bossId];
        if (r) {
          const collected = recordResources({
            ...bumpKillQuests(state),
            bullets: state.bullets + r.bullets,
            keys: state.keys + (r.keys ?? 0),
            zhetons: state.zhetons + r.zhetons,
            gold: state.gold + r.gold,
            gast: battle.source === 'gast' ? { ...state.gast, active: false, districtId: null } : state.gast,
            woundedBosses: wb,
            battle: null,
            battleVisible: false,
            lastMessage: `Награда за босса: +${r.bullets} пуль${r.gold ? `, +${r.gold} припасов` : ''}.${r.dropped ? ' ВЫПАЛО: найдена комната!' : ' НЕ ВЫПАЛО.'}`,
          }, 'boss', { bullets: r.bullets, supplies: r.gold });
          return recordClanEvent(collected, 'zombie');
        }
      }
      // Поражение или отступление: сохраняем урон канвасного босса
      if (battle.source === 'boss' && battle.bossHp > 0) {
        const wb = { ...state.woundedBosses, [battle.bossId]: battle.bossHp };
        return {
          ...state,
          battle: null,
          battleVisible: false,
          woundedBosses: wb,
          lastMessage: battle.outcome === 'lost'
            ? 'Вы выбыли из боя.'
            : `Отступили от ${battle.bossName} (осталось ${battle.bossHp}/${battle.bossMaxHp} HP)`,
        };
      }
      return { ...state, battle: null, battleVisible: false };
    }
    case 'START_RAID': {
      // Рейды с карты районов: запускают таймер и открывают окно рейда
      const mapRaid = state.mapRaids.find((r) => r.id === action.raidId);
      if (mapRaid) {
        // Рейд уже идёт (или ждёт получения награды) — просто открываем его окно,
        // энергию повторно не списываем и другие рейды не трогаем
        if (mapRaid.isRunning) {
          return {
            ...state,
            raidTasks: { raidId: mapRaid.id, completedIds: state.raidTaskProgress[mapRaid.id] ?? [], open: false },
            showRaidModal: true,
            activeRaidId: mapRaid.id,
            lastMessage: `${mapRaid.name}: рейд уже идёт.`,
          };
        }
        if (state.energy < mapRaid.energyCost) {
          return msg(state, `Не хватает энергии: нужно ${mapRaid.energyCost}, у вас ${state.energy}.`);
        }
        const raidDuration = mapRaid.type === 'yellow' ? 15 * 60 * 1000 : 30 * 60 * 1000; // 15 или 30 минут
        const now = Date.now();
        return {
          ...state,
          energy: state.energy - mapRaid.energyCost,
          raidTasks: { raidId: mapRaid.id, completedIds: [], open: false },
          raidTaskProgress: { ...state.raidTaskProgress, [mapRaid.id]: [] },
          showRaidModal: true,
          activeRaidId: mapRaid.id,
          mapRaids: state.mapRaids.map((r) =>
            r.id === action.raidId
              ? { ...r, isRunning: true, completed: false, notified: false, startTime: now, endTime: now + raidDuration }
              : r
          ),
          lastMessage: `${mapRaid.name}: рейд начат. Можно свернуть окно — время продолжится.`,
        };
      }

      // Рейды из панели «Рейды»: пошаговый проход со сбором ящиков
      const raid = RAIDS.find((r) => r.id === action.raidId);
      if (!raid) return state;
      const next = spend(state, raid.energy);
      if (!next) return msg(state, `Рейд стоит ${raid.energy} энергии.`);
      return {
        ...next,
        raid: { raidId: raid.id, scouted: false, cratesLooted: false, pathClear: false },
        lastMessage: `${raid.name}: сначала дойдите до выхода, потом собирайте ящики.`,
      };
    }
    case 'RAID_SCOUT': {
      if (!state.raid || state.raid.scouted) return state;
      const strong = state.raid.raidId !== 'marauder_base' && Math.random() < 0.2;
      return {
        ...state,
        raid: { ...state.raid, scouted: true, pathClear: !strong },
        lastMessage: strong
          ? 'На пути сильный босс. Не зависайте: ветераны не зовут сильнее Злого Горожанина.'
          : 'Путь чист. Можно собирать ящики — с них экипировка и жетоны.',
      };
    }
    case 'RAID_BYPASS': {
      if (!state.raid || !state.raid.scouted || state.raid.pathClear) return state;
      const next = spend(state, 10);
      if (!next) return msg(state, 'Обход стоит 10 энергии.');
      return {
        ...next,
        raid: { ...state.raid, pathClear: true },
        lastMessage: 'Обошли сильного босса. Не создавайте сильнее Злого Горожанина — бой может зависнуть.',
      };
    }
    case 'RAID_LOOT': {
      if (!state.raid || !state.raid.scouted) return msg(state, 'Сначала разведка до выхода.');
      if (!state.raid.pathClear) return msg(state, 'Сначала уберите сильного босса с пути.');
      if (state.raid.cratesLooted) return msg(state, 'Ящики уже собраны.');
      const raid = RAIDS.find((r) => r.id === state.raid?.raidId);
      if (!raid) return state;
      const bonus = raid.id === 'marauder_base' ? 2 : 1;
      let next = {
        ...state,
        matches: state.matches + raid.matches * bonus,
        grenades: state.grenades + raid.grenades * bonus,
        medkits: state.medkits + raid.medkits * bonus,
        raid: { ...state.raid, cratesLooted: true },
      };
      // Loot drop from crates
      const drops = lootDrop();
      let dropMsg = '';
      for (const drop of drops) {
        const item = INVENTORY_ITEMS.find((i) => i.id === drop.itemId);
        if (item) {
          next = {
            ...next,
            inventory: [...next.inventory, { itemId: drop.itemId, equipped: false }],
          };
          dropMsg += ` ${item.icon}${item.name}×${drop.count}`;
        }
      }
      next = {
        ...next,
        lastMessage: `${raid.name}: ящики собраны. +${raid.matches * bonus} спичек, гранаты и аптечки.${dropMsg}`,
      };
      // Update quest progress for raid_loot
      const lootQuest = next.daily.quests.find((qp) => qp.questId === 'q3');
      if (lootQuest && !lootQuest.completed && !lootQuest.claimed) {
        const quest = DAILY_QUESTS.find((q) => q.id === 'q3');
        const newProgress = Math.min(quest?.target ?? Infinity, lootQuest.progress + 1);
        next = {
          ...next,
          daily: {
            ...next.daily,
            quests: next.daily.quests.map((qp) =>
              qp.questId === 'q3' ? { ...qp, progress: newProgress, completed: newProgress >= (quest?.target ?? 0) } : qp
            ),
          },
        };
      }
      return recordClanEvent(recordResources(next, 'raid', { matches: raid.matches * bonus }), 'medkit', raid.medkits * bonus);
    }
    case 'LEAVE_RAID':
      return { ...state, raid: null };
    case 'LOTTERY': {
      if (state.daily.lotteryUsed) return msg(state, 'Бесплатный розыгрыш уже был сегодня.');
      const roll = Math.random();
      let lastMessage = 'Пустой билет.';
      let next = { ...state, daily: { ...state.daily, lotteryUsed: true } };
      if (roll < 0.4) {
        next = { ...next, bullets: next.bullets + 20 };
        lastMessage = 'Лотерея: +20 патронов.';
      } else if (roll < 0.7) {
        next = { ...next, grenades: next.grenades + 5 };
        lastMessage = 'Лотерея: +5 гранат.';
      } else {
        next = { ...next, gold: next.gold + 2 };
        lastMessage = 'Лотерея: +2 золота.';
      }
      return { ...next, lastMessage };
    }
    case 'SEARCH_FRIEND': {
      const next = spend(state, 8);
      if (!next) return msg(state, 'Обыск друга: 8 энергии.');
      const zhetons = 1 + Math.floor(Math.random() * 3);
      return {
        ...next,
        zhetons: next.zhetons + zhetons,
        lastMessage: `Обыск друга: +${zhetons} жетонов.`,
      };
    }
    case 'RADIO_HELP': {
      if (state.radioRequests.length === 0) return msg(state, 'Рация молчит.');
      const [, ...rest] = state.radioRequests;
      return {
        ...state,
        radioRequests: rest,
        bullets: state.bullets + 6,
        lastMessage: 'Помогли по рации: +6 патронов.',
      };
    }
    case 'SET_PLAYER': {
      if (!action.id.trim()) return state;
      return withTodayWar(syncClans({ ...state, playerId: action.id, playerName: action.name.trim() || 'Выживший' }, state.clanDirectory));
    }
    case 'SYNC_CLANS':
      return withTodayWar(syncClans(state, action.clans));
    case 'APPLY_TO_CLAN': {
      if (state.clan || state.clanDirectory.some((entry) => entry.members.some((member) => member.id === state.playerId))) {
        return msg(state, 'Вы уже состоите в убежище.');
      }
      if (state.pendingClanId) return msg(state, 'У вас уже есть заявка. Дождитесь ответа.');
      const clan = state.clanDirectory.find((entry) => entry.id === action.clanId);
      if (!clan) return msg(state, 'Убежище не найдено.');
      if (clan.members.length >= CLAN_MAX_MEMBERS) return msg(state, 'В убежище больше нет мест.');
      const updated = { ...clan, applications: [...clan.applications, { userId: state.playerId, userName: state.playerName, createdAt: Date.now() }] };
      return { ...replaceClan(state, updated), pendingClanId: clan.id, lastMessage: 'Заявка передана по рации. Ожидайте ответа лидера.' };
    }
    case 'CANCEL_CLAN_APPLICATION': {
      if (!state.pendingClanId) return state;
      const clans = state.clanDirectory.map((entry) => entry.id === state.pendingClanId
        ? { ...entry, applications: entry.applications.filter((request) => request.userId !== state.playerId) }
        : entry);
      return { ...state, clanDirectory: clans, pendingClanId: null, lastMessage: 'Заявка отозвана.' };
    }
    case 'RESOLVE_CLAN_APPLICATION': {
      const clan = state.clanDirectory.find((entry) => entry.id === action.clanId);
      if (!clan || clan.leaderId !== state.playerId) return msg(state, 'Заявки может обработать только лидер.');
      const application = clan.applications.find((entry) => entry.userId === action.userId);
      if (!application) return msg(state, 'Заявка уже обработана.');
      if (action.accept && state.clanDirectory.some((entry) => entry.members.some((member) => member.id === application.userId))) {
        return msg(state, 'Игрок уже вступил в другое убежище.');
      }
      if (action.accept && clan.members.length >= CLAN_MAX_MEMBERS) return msg(state, 'В убежище больше нет мест.');
      const members = action.accept
        ? [...clan.members, { id: application.userId, name: application.userName, role: 'member' as const, joinedAt: Date.now() }]
        : clan.members;
      const nextClan = { ...clan, members, applications: clan.applications.filter((entry) => entry.userId !== application.userId) };
      nextClan.rating = clanRating(nextClan);
      return { ...replaceClan(state, nextClan), lastMessage: action.accept ? 'Новый выживший принят в убежище.' : 'Заявка отклонена.' };
    }
    case 'CREATE_CLAN': {
      if (state.clan || state.clanDirectory.some((entry) => entry.members.some((member) => member.id === state.playerId))) {
        return msg(state, 'Вы уже состоите в убежище.');
      }
      if (state.gold < CLAN_CREATE_GOLD) return msg(state, `Нужно 🪙 ${CLAN_CREATE_GOLD} припасов.`);
      const error = validateClanName(action.name, state.clanDirectory);
      if (error) return msg(state, error);
      if (!CLAN_EMBLEMS.some((entry) => entry.id === action.emblem)) return msg(state, 'Выберите эмблему.');
      const name = normalizeClanName(action.name);
      const createdAt = Date.now();
      const clan: ClanState = {
        id: globalThis.crypto?.randomUUID?.() ?? `clan-${createdAt}-${Math.random().toString(36).slice(2)}`,
        name,
        emblem: action.emblem,
        description: 'Новое убежище выживших. Здесь найдётся место тем, кто не сдаётся.',
        leaderId: state.playerId,
        members: [{ id: state.playerId, name: state.playerName, role: 'leader', joinedAt: createdAt }],
        applications: [], createdAt, taskPoints: 0, taskProgress: {}, rating: CLAN_MEMBER_BONUS,
        score: 0, warRating: state.clanRating, warWins: 0, warLosses: 0, warStreak: 0,
      };
      const directory = state.clanDirectory.map((entry) => entry.id === state.pendingClanId
        ? { ...entry, applications: entry.applications.filter((request) => request.userId !== state.playerId) }
        : entry);
      return withTodayWar({
        ...replaceClan({ ...state, clan, clanDirectory: directory }, clan),
        gold: state.gold - CLAN_CREATE_GOLD,
        pendingClanId: null,
        clan,
        lastMessage: 'Убежище основано!',
      });
    }
    case 'CLAN_TASK_EVENT':
      return recordClanEvent(state, action.event, action.amount);
    case 'CLAN_WAR_CONTRIBUTE': {
      if (!state.clan) return msg(state, 'Нужен клан для участия в войнах.');
      const withWar = withTodayWar(state);
      return clanWarContribute(withWar, withWar.clanWar!);
    }
    case 'CLAN_WAR_CLAIM': {
      if (!state.clan || !state.clanWar) return msg(state, 'Война клана не идёт.');
      const war = state.clanWar;
      if (war.dateKey !== dateKey()) return msg(state, 'Война уже завершена.');
      if (war.claimed) return msg(state, 'Награда за войну уже получена.');
      if (war.contributions < CLAN_WAR_MIN_CONTRIB) return msg(state, `Нужно ${CLAN_WAR_MIN_CONTRIB} взносов.`);

      // Очки противника на сегодня уже заданы при жеребьёвке войны
      const enemyScore = war.enemyScore;
      const win = war.clanScore >= enemyScore;
      // За победу даётся тем больше, чем сильнее противник; за поражение — небольшой штраф
      const ratingDelta = win
        ? 1 + Math.min(10, Math.floor(war.enemyRating / 30))
        : -Math.min(3, Math.max(1, Math.floor(state.clanRating / 50)));
      const newRating = Math.max(0, state.clanRating + ratingDelta);
      const newStreak = win ? war.streak + 1 : 0;
      const goldReward = computeClanWarGold(win, newStreak);
      const entry: ClanWarHistoryEntry = {
        dateKey: war.dateKey,
        enemyName: war.enemyName,
        clanScore: war.clanScore,
        enemyScore,
        win,
        gold: goldReward,
        ratingDelta,
      };
      const history = [entry, ...state.clanWarHistory].slice(0, CLAN_WAR_HISTORY_LIMIT);

      const updatedClan: ClanState = {
        ...state.clan,
        warRating: newRating,
        warWins: state.clan.warWins + (win ? 1 : 0),
        warLosses: state.clan.warLosses + (win ? 0 : 1),
        warStreak: newStreak,
      };
      return {
        ...replaceClan(state, updatedClan),
        gold: state.gold + goldReward,
        clanRating: newRating,
        clanWar: { ...war, claimed: true },
        clanWarHistory: history,
        lastMessage: win
          ? `Клан победил «${war.enemyName}»! +${goldReward} золота, рейтинг ${ratingDelta >= 0 ? '+' : ''}${ratingDelta}.`
          : `Клан проиграл «${war.enemyName}». +${goldReward} золота, рейтинг ${ratingDelta}.`,
      };
    }
    case 'FORGE_ITEM': {
      // Найти незафорженный предмет в инвентаре
      const slotIdx = state.inventory.findIndex((s) => s.itemId !== 'matches' && s.itemId !== 'zhetons' && !s.forged && !s.equipped);
      if (slotIdx === -1) return msg(state, 'Нет предметов для зачарования.');
      if (state.zhetons < 5) return msg(state, 'Нужно 5 жетонов.');
      const slot = state.inventory[slotIdx];
      return {
        ...state,
        zhetons: state.zhetons - 5,
        inventory: state.inventory.map((s, i) =>
          i === slotIdx ? { ...s, forged: true } : s
        ),
        lastMessage: `Зачаровано: ${slot.itemId}. +20% урона.`,
      };
    }
    case 'UNFORGE_ITEM': {
      // Расплавить зафорженный предмет — вернуть 2 жетона
      const slotIdx = state.inventory.findIndex((s) => s.forged);
      if (slotIdx === -1) return msg(state, 'Нет зафорженных предметов.');
      const slot = state.inventory[slotIdx];
      return {
        ...state,
        zhetons: state.zhetons + 2,
        inventory: state.inventory.map((s, i) =>
          i === slotIdx ? { ...s, forged: false } : s
        ),
        lastMessage: `Расплавлено: ${slot.itemId}. +2 жетона.`,
      };
    }
    case 'CLAIM_QUEST_REWARD': {
      const questProgress = state.daily.quests.find((qp) => qp.questId === action.questId);
      if (!questProgress || !questProgress.completed || questProgress.claimed) return msg(state, 'Квест недоступен.');
      const quest = DAILY_QUESTS.find((q) => q.id === action.questId);
      if (!quest) return state;
      return {
        ...state,
        bullets: state.bullets + quest.rewardBullets,
        matches: state.matches + quest.rewardMatches,
        grenades: state.grenades + quest.rewardGrenades,
        gold: state.gold + quest.rewardGold,
        daily: {
          ...state.daily,
          quests: state.daily.quests.map((qp) =>
            qp.questId === action.questId ? { ...qp, claimed: true } : qp
          ),
        },
        lastMessage: `Квест «${quest.name}» выполнен! +${quest.rewardBullets} патронов, +${quest.rewardMatches} спичек, +${quest.rewardGrenades} гранат, +${quest.rewardGold} золота.`,
      };
    }
    case 'EQUIP_ITEM': {
      const slot = state.inventory[action.slotIndex];
      if (!slot) return state;
      const isEquipped = slot.equipped;
      if (isEquipped) {
        return {
          ...state,
          inventory: state.inventory.map((s, i) => (i === action.slotIndex ? { ...s, equipped: false } : s)),
          equipmentIds: state.equipmentIds.filter((id) => id !== slot.itemId),
          lastMessage: `Снято: ${INVENTORY_ITEMS.find((i) => i.id === slot.itemId)?.name ?? 'предмет'}.`,
        };
      }
      // Check if already equipped
      if (state.equipmentIds.includes(slot.itemId)) return msg(state, 'Уже надето.');
      // Unequip same type item if needed
      return {
        ...state,
        inventory: state.inventory.map((s, i) => (i === action.slotIndex ? { ...s, equipped: true } : s)),
        equipmentIds: [...state.equipmentIds, slot.itemId],
        lastMessage: `Надето: ${INVENTORY_ITEMS.find((i) => i.id === slot.itemId)?.name ?? 'предмет'}.`,
      };
    }
    case 'UNEQUIP_ITEM': {
      const slot = state.inventory[action.slotIndex];
      if (!slot) return state;
      return {
        ...state,
        inventory: state.inventory.map((s, i) => (i === action.slotIndex ? { ...s, equipped: false } : s)),
        equipmentIds: state.equipmentIds.filter((id) => id !== slot.itemId),
        lastMessage: `Снято: ${INVENTORY_ITEMS.find((i) => i.id === slot.itemId)?.name ?? 'предмет'}.`,
      };
    }
    case 'CRAFT_ITEM': {
      const recipe = CRAFTING_RECIPES.find((r) => r.id === action.recipeId);
      if (!recipe) return state;
      // Check all costs
      for (const cost of recipe.cost) {
        if (cost.itemId === 'matches') {
          if (state.matches < cost.count) return msg(state, `Не хватает спичек для крафта.`);
        } else if (cost.itemId === 'zhetons') {
          if (state.zhetons < cost.count) return msg(state, `Не хватает жетонов для крафта.`);
        } else {
          const countInInventory = state.inventory.filter((s) => s.itemId === cost.itemId && !s.equipped).length;
          if (countInInventory < cost.count) return msg(state, `Не хватает ресурсов: ${cost.itemId}.`);
        }
      }
      // Deduct costs
      let next = {
        ...state,
        matches: state.matches - recipe.cost.filter((c) => c.itemId === 'matches').reduce((s, c) => s + c.count, 0),
        zhetons: state.zhetons - recipe.cost.filter((c) => c.itemId === 'zhetons').reduce((s, c) => s + c.count, 0),
      };
      // Remove raw materials
      for (const cost of recipe.cost) {
        if (cost.itemId === 'matches' || cost.itemId === 'zhetons') continue;
        let toRemove = cost.count;
        next = {
          ...next,
          inventory: next.inventory.reduce((acc, s) => {
            if (toRemove <= 0) return [...acc, s];
            if (s.itemId === cost.itemId && !s.equipped) {
              toRemove--;
              return acc;
            }
            return [...acc, s];
          }, [] as typeof next.inventory),
        };
      }
      // Аптечки попадают в боевые расходники, остальные изделия — в инвентарь.
      const isMedkitBundle = recipe.id === 'medkit_bundle';
      const craftedItem = INVENTORY_ITEMS.find((i) => i.id === recipe.resultItemId);
      if (!isMedkitBundle && !craftedItem) return msg(state, 'Ошибка крафта: результат не найден.');
      next = {
        ...next,
        medkits: next.medkits + (isMedkitBundle ? recipe.resultCount : 0),
        inventory: isMedkitBundle ? next.inventory : [
          ...next.inventory,
          ...Array.from({ length: recipe.resultCount }, () => ({ itemId: recipe.resultItemId, equipped: false })),
        ],
        craftingRecipes: [...next.craftingRecipes, recipe.id],
        lastMessage: `Скрафчено: ${recipe.name}!`,
      };
      // Update quest progress
      const craftQuest = next.daily.quests.find((qp) => qp.questId === 'q5');
      if (craftQuest && !craftQuest.completed && !craftQuest.claimed) {
        const quest = DAILY_QUESTS.find((q) => q.id === 'q5');
        const newProgress = Math.min(quest?.target ?? Infinity, craftQuest.progress + 1);
        next = {
          ...next,
          daily: {
            ...next.daily,
            quests: next.daily.quests.map((qp) =>
              qp.questId === 'q5' ? { ...qp, progress: newProgress, completed: newProgress >= (quest?.target ?? 0) } : qp
            ),
          },
        };
      }
      if (recipe.id === 'barricade') return recordClanEvent(next, 'barricade');
      if (isMedkitBundle) return recordClanEvent(next, 'medkit', recipe.resultCount);
      return next;
    }
    case 'TOGGLE_SOUND':
      return { ...state, soundEnabled: !state.soundEnabled };
    case 'TOGGLE_MAP':
      return { ...state, showMap: !state.showMap };
    case 'TOGGLE_BOSS_MODAL':
      return { ...state, showBossModal: !state.showBossModal };
    case 'TOGGLE_CLAN_MODAL':
      return { ...state, showClanModal: !state.showClanModal };
    case 'MINIMIZE_RAID':
      // Сворачиваем окно: рейд продолжает идти в фоне, энергия уже потрачена
      return { ...state, showRaidModal: false, activeRaidId: null,
        raidTasks: state.raidTasks ? { ...state.raidTasks, open: false } : null };
    case 'CHECK_RAIDS': {
      // Вызывается по таймеру: создаёт уведомление для каждого рейда, время которого вышло
      const now = Date.now();
      const finished = state.mapRaids.filter(
        (r) => r.isRunning && !r.notified && !!r.endTime && now >= r.endTime
      );
      if (finished.length === 0) return state;

      const newNotifications: GameNotification[] = finished.map((r) => ({
        id: `raid_done_${r.id}_${r.endTime}`,
        text: `Рейд «${r.name}» завершён — награда ждёт получения`,
        createdAt: now,
        read: false,
        raidId: r.id,
      }));

      return {
        ...state,
        notifications: [...newNotifications, ...state.notifications].slice(0, 30),
        mapRaids: state.mapRaids.map((r) =>
          finished.some((f) => f.id === r.id) ? { ...r, notified: true } : r
        ),
        lastMessage: finished.length === 1
          ? `${finished[0].name}: рейд завершён.`
          : `Завершено рейдов: ${finished.length}.`,
      };
    }
    case 'TOGGLE_NOTIFICATIONS': {
      const show = !state.showNotifications;
      return {
        ...state,
        showNotifications: show,
        // Открыли панель — считаем уведомления прочитанными
        notifications: show ? state.notifications.map((n) => ({ ...n, read: true })) : state.notifications,
      };
    }
    case 'REMOVE_NOTIFICATION':
      // Удаляем конкретное уведомление (крестик в списке)
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.id),
      };
    case 'CLEAR_NOTIFICATIONS':
      // Очищаем весь список уведомлений
      return { ...state, notifications: [] };
    case 'CANCEL_RAID': {
      const raid = state.mapRaids.find((r) => r.id === action.raidId);
      if (!raid || !raid.isRunning) return state;

      // Возвращаем часть энергии (50%)
      const refund = Math.floor(raid.energyCost * 0.5);

      return {
        ...state,
        energy: state.energy + refund,
        showRaidModal: false,
        activeRaidId: null,
        raidTasks: state.raidTasks?.raidId === action.raidId ? null : state.raidTasks,
        mapRaids: state.mapRaids.map((r) =>
          r.id === action.raidId ? { ...r, isRunning: false, startTime: undefined, endTime: undefined } : r
        ),
        lastMessage: `${raid.name}: рейд отменён, возвращено ${refund} энергии.`,
      };
    }
    case 'CLAIM_RAID_REWARD': {
      const raid = state.mapRaids.find((r) => r.id === action.raidId);
      if (!raid || !raid.isRunning || !raid.endTime) return state;
      if (Date.now() < raid.endTime) return msg(state, 'Рейд ещё не завершён.');

      const collected = recordResources({
        ...state,
        matches: state.matches + raid.rewards.matches,
        keys: state.keys + raid.rewards.materials,
        showRaidModal: false,
        activeRaidId: null,
        raidTasks: state.raidTasks?.raidId === raid.id ? { ...state.raidTasks, open: false } : state.raidTasks,
        mapRaids: state.mapRaids.map((r) =>
          r.id === action.raidId ? { ...r, isRunning: false, completed: true, startTime: undefined, endTime: undefined } : r
        ),
        lastMessage: `${raid.name}: +${raid.rewards.matches} спичек из рейда.`,
      }, 'raid', { matches: raid.rewards.matches });
      return recordClanEvent(collected, 'raid');
    }
    case 'OPEN_RAID_TASKS': {
      const raid = state.mapRaids.find((entry) => entry.id === action.raidId);
      if (!raid?.isRunning || raid.completed) return msg(state, 'Эта опасность уже пройдена.');
      return { ...state, raidTasks: { raidId: raid.id,
        completedIds: state.raidTaskProgress[raid.id] ?? [], open: true },
      };
    }
    case 'CLOSE_RAID_TASKS':
      return state.raidTasks ? { ...state, raidTasks: { ...state.raidTasks, open: false } } : state;
    case 'COMPLETE_RAID_TASKS': {
      const tasks = state.raidTasks;
      const raid = state.mapRaids.find((entry) => entry.id === action.raidId);
      if (!tasks?.open || tasks.raidId !== action.raidId || !raid?.isRunning || raid.completed) return state;
      const remaining = RAID_DANGER_TASKS.filter((task) => !tasks.completedIds.includes(task.id));
      if (!remaining.length) return msg(state, 'Все контракты рейда выполнены.');
      let availableEnergy = state.energy;
      const completed = action.mode === 'gold' ? remaining : remaining.filter((task) => {
        if (availableEnergy < task.energy) return false;
        availableEnergy -= task.energy;
        return true;
      });
      if (action.mode === 'gold' && state.premiumGold < RAID_TASK_GOLD_PRICE) return msg(state, 'Недостаточно премиум-золота 🪙.');
      if (!completed.length) return msg(state, 'Не хватает энергии даже на одно задание.');
      const tokens = completed.reduce((sum, task) => sum + task.tokens, 0);
      const hp = completed.reduce((sum, task) => sum + task.hp, 0);
      const next = {
        ...state,
        premiumGold: state.premiumGold - (action.mode === 'gold' ? RAID_TASK_GOLD_PRICE : 0),
        energy: action.mode === 'energy' ? availableEnergy : state.energy,
        zhetons: state.zhetons + tokens,
        health: Math.min(state.maxHealth, state.health + hp),
        raidTasks: { ...tasks, completedIds: [...tasks.completedIds, ...completed.map((task) => task.id)] },
        raidTaskProgress: { ...state.raidTaskProgress,
          [raid.id]: [...tasks.completedIds, ...completed.map((task) => task.id)] },
        lastMessage: `ВЫПОЛНЕНО: ${completed.length} заданий, +${tokens} жетонов 🎟️, +${hp} HP.`,
      };
      return recordResources(action.mode === 'gold' ? recordResources(next, 'shop', { premiumGold: -RAID_TASK_GOLD_PRICE }) : next, 'solo-task', { tokens });
    }
    case 'CHANGE_LOCATION': {
      const room = LOCATIONS.find((location) => location.id === action.locationId);
      if (!room || !state.unlockedRooms.includes(room.id)) {
        return msg(state, 'Комната ещё закрыта. Победите босса, чтобы открыть её.');
      }
      return { ...state, currentLocation: room.id, lastMessage: `Вы вошли в комнату «${room.name}».` };
    }
    case 'BUY_SHELTER_ITEM': {
      const item = SHELTER_ITEMS.find((entry) => entry.id === action.itemId);
      if (!item) return state;
      if (item.id === 'bed' && state.shelterBed) return msg(state, 'Кровать выжившего уже установлена.');
      if (item.id === 'generator' && state.shelterGenerator) return msg(state, 'Генератор уже запущен.');
      if (state.gold < item.price) return msg(state, `Не хватает припасов: нужно ${item.price} 💰.`);
      const gold = state.gold - item.price;

      switch (item.id) {
        case 'bed': {
          const bonus = Math.round(state.maxEnergy * 0.5);
          return {
            ...state,
            caps,
            shelterBed: true,
            maxEnergy: state.maxEnergy + bonus,
            energy: state.energy + bonus,
            lastMessage: `Кровать выжившего: +${bonus} к максимуму энергии.`,
          };
        }
        case 'weapon_crate': {
          const drop = SHOP[Math.floor(Math.random() * SHOP.length)];
          return {
            ...state,
            caps,
            inventory: [...state.inventory, { itemId: drop.id, equipped: false }],
            lastMessage: `Из ящика выпал предмет: ${drop.name}.`,
          };
        }
        case 'survivor_kit': {
          return {
            ...state,
            caps,
            shelterKit: true,
            bullets: state.bullets + 100,
            matches: state.matches + 50,
            medkits: state.medkits + 5,
            grenades: state.grenades + 2,
            gold: state.gold + 200,
            lastMessage: 'Набор выжившего распакован: ресурсы + бонус.',
          };
        }
        case 'generator': {
          return {
            ...state,
            caps,
            shelterGenerator: true,
            lastMessage: 'Генератор запущен: энергия восстанавливается вдвое быстрее.',
          };
        }
        default:
          return state;
      }
    }
    case 'BUY_SKIN': {
      const skin = getRoomSkin(action.skinId);
      if (!skin) return state;
      if (skin.price === 0) return msg(state, 'Базовое оформление выдаётся бесплатно — просто примените его.');
      if (state.ownedSkins.includes(skin.id)) return msg(state, 'Оформление уже куплено.');
      if (state.caps < skin.price) return msg(state, `Не хватает крышек: нужно ${skin.price} 🥤.`);
      return {
        ...state,
        caps: state.caps - skin.price,
        ownedSkins: [...state.ownedSkins, skin.id],
        lastMessage: `Оформление «${skin.name}» куплено.`,
      };
    }
    case 'APPLY_SKIN': {
      const skin = getRoomSkin(action.skinId);
      if (!skin) return state;
      if (skin.price > 0 && !state.ownedSkins.includes(skin.id)) {
        return msg(state, 'Сначала купите это оформление.');
      }
      if (!state.unlockedRooms.includes(skin.roomId)) {
        return msg(state, 'Комната этого оформления ещё закрыта.');
      }
      return {
        ...state,
        currentLocation: skin.roomId,
        selectedSkins: { ...state.selectedSkins, [skin.roomId]: skin.id },
        lastMessage: `Фон «${skin.name}» применён.`,
      };
    }
    default:
      return state;
  }
};
