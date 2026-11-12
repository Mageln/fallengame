import { normalizeMapRaids } from './extraMapRaids';
import { addBossKey, BOSS_KEY_PRICES, bossRequiresKey, normalizeBossKeys } from './bossKeys';
import { normalizeCasino, reduceCasino } from './casino';
import { TUTORIAL_STEPS, TUTORIAL_VERSION, tutorialIsActive, tutorialViewStep } from './tutorial';
import { reduceArena } from './arena';
import { reduceRaid } from './raidReducer';
import { reduceBattle } from './battleReducer';
import { normalizeBattle, advanceBossClock } from './battleEngine';
import { reduceInventory } from './inventoryReducer';
import { msg, recordResources, replaceClan, syncClans, recordClanEvent, spend } from './reducerShared';
import { LOGIN_REWARDS, loginRewardStatus, normalizeLoginRewards } from './loginRewards';
import { normalizeProfileSkills, SKILL_DEFS, SKILL_MAX_LEVEL, skillCost } from './profileSkills';
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
  SHOP,
  SHELTER_ITEMS,
  getRoomSkin,
  WEAPON_MAX_LEVEL,
  DAILY_QUESTS,
  normalizeWeapon,
  DEFAULT_STATS,
} from './constants';
import {
  canEnterDistrict,
  carUpgradeCost,
  dateKey,
  getDistrict,
  levelUpCost,
  luckUpgradeCost,
  staminaUpgradeCost,
  weaponRepairCost,
  weaponUpgradeCost,
  weaponUpgradeUpgradeCost,
  weekKey,
} from './formulas';
import { normalizeBossAttacks, resetBossAttacks } from './bossAttacks';
import { todayLocal } from './survival';
import { clanRating, normalizeClanName, validateClanName, CLAN_EMBLEMS, CLAN_MEMBER_BONUS } from './clans';
import { ClanState, ClanWarHistoryEntry, ClanWarState, GameAction, GameState } from './types';

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

export const applyDailyReset = (state: GameState): GameState => {
  const today = dateKey();
  let next: GameState = state;
  if (state.daily.dateKey !== today) {
    next = {
      ...next,
      daily: {
        dateKey: today,
        lotteryUsed: false,
        goldClaimed: false,
        questDate: state.daily.questDate,
        questBonusClaimed: state.daily.questBonusClaimed,
        quests: state.daily.quests,
      },
      // Вчерашняя война клана закрыта — сегодня жеребьёвка новой
      clanWar: null,
      lastMessage: 'Новый день в Эргейте. Заберите золото за вход и квесты обновлены.',
    };
  }
  next = withTodayWar(next);
  return rollGast(next);
};

// Контракты обновляются по локальной полуночи, независимо от других суточных таймеров.
const refreshDailyQuests = (state: GameState): GameState => {
  const today = todayLocal();
  if (state.daily.questDate === today) return state;
  return { ...state, daily: { ...state.daily, questDate: today, questBonusClaimed: false,
    quests: DAILY_QUESTS.map((q) => ({ questId: q.id, progress: 0, completed: false, claimed: false })) } };
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

export const hydrateState = (state: GameState): GameState => {
  // Normalize old saves that may lack new fields
  let normalized: GameState = { ...normalizeMapRaids(state), casino: normalizeCasino(state.casino), bossKeys: normalizeBossKeys(state.bossKeys) };
  
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
  // Сохраняем совпадающие контракты старых сохранений, включая уже забранные награды.
  const oldQuests = normalized.daily.quests;
  normalized = { ...normalized, daily: { ...normalized.daily,
    questDate: normalized.daily.questDate ?? (normalized.daily.dateKey === dateKey() ? todayLocal() : normalized.daily.dateKey),
    questBonusClaimed: normalized.daily.questBonusClaimed ?? false,
    quests: DAILY_QUESTS.map((quest) => {
      const old = oldQuests.find((entry) => entry.questId === quest.id);
      const progress = Math.min(quest.target, Math.max(0, Number.isFinite(old?.progress) ? old!.progress : 0));
      return { questId: quest.id, progress, completed: !!old?.claimed || progress >= quest.target, claimed: !!old?.claimed };
    }),
  } };
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
    storedWeapons: Array.isArray(normalized.storedWeapons) ? normalized.storedWeapons.filter((w) => w && typeof w.id === 'string' && w.id !== normalized.weapon.id).map(normalizeWeapon) : [],
    loginRewards: normalizeLoginRewards(normalized.loginRewards),
    profileSkills: normalizeProfileSkills(normalized.profileSkills),
    experience: Number.isFinite(normalized.experience) ? Math.max(0, Math.floor(normalized.experience)) : 0,
    premiumGold: Number.isFinite(normalized.premiumGold) ? Math.max(0, normalized.premiumGold) : 0,
    maxHealth: Number.isFinite(normalized.maxHealth) && normalized.maxHealth > 0 ? normalized.maxHealth : 100,
    health: Number.isFinite(normalized.health) ? Math.max(0, normalized.health) : 100,
    battleVisible: normalized.battle ? (normalized.battleVisible ?? true) : false,
    battle: normalized.battle ? normalizeBattle(normalized.battle) : null,
    bossAttacks: normalizeBossAttacks(
      normalized.bossAttacks ?? { date: todayLocal(), entries: {} },
    ),
    lastRoomRoll: normalized.lastRoomRoll ?? null,
    pendingRoomDrop: normalized.pendingRoomDrop ?? null,
    raidTasks: normalized.raidTasks ?? null,
    raidTaskProgress: normalized.raidTaskProgress ?? (normalized.raidTasks ? { [normalized.raidTasks.raidId]: normalized.raidTasks.completedIds } : {}),
    resourceEvents: Array.isArray(normalized.resourceEvents) ? normalized.resourceEvents : [],
  };

  return advanceBossClock(resetBossAttacks(refreshDailyQuests(applyDailyReset(syncClans(normalized, normalized.clanDirectory)))), Date.now());
};

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  if (action.type !== 'HYDRATE_STATE') {
    state = normalizeMapRaids(state);
    // Server snapshots from before the new skills also pass through this path.
    if (!state.profileSkills || state.profileSkills.weapon === undefined || state.profileSkills.heal === undefined) {
      state = { ...state, profileSkills: normalizeProfileSkills(state.profileSkills) };
    }
    state = refreshDailyQuests(state);
  }
  // Босс на отдельной арене: старые кнопки пошагового боя не обходят его кулдауны.
  if (state.battle?.source === 'boss' && (action.type.startsWith('BATTLE_') || action.type === 'INVITE_FRIEND')) return state;
  switch (action.type) {
    case 'CASINO_SAFE':
    case 'CASINO_SLOTS':
    case 'CASINO_CARD':
    case 'CASINO_PRIZE':
      return reduceCasino(state, action);
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
        case 'caps':
          return { ...state, caps: state.caps + amount, lastMessage: `+${amount} крышек` };
        default:
          return state;
      }
    }
    case 'CLEAR_MESSAGE':
      return { ...state, lastMessage: '' };
    case 'BUY_BOSS_KEY': {
      if (!bossRequiresKey(action.bossId)) return state;
      const price = BOSS_KEY_PRICES[action.bossId];
      if (!Number.isSafeInteger(state.premiumGold) || state.premiumGold < price) return msg(state, `Не хватает премиум-золота: нужно ${price}.`);
      return { ...state, premiumGold: state.premiumGold - price,
        bossKeys: addBossKey(state.bossKeys, action.bossId), lastMessage: `Ключ куплен за ${price} премиум-золота.` };
    }
    case 'SET_APPEARANCE':
      return { ...state, appearance: action.appearance };
    // Повторно запускать пройденное или пропущенное обучение нельзя.
    case 'START_TUTORIAL':
    case 'NEXT_TUTORIAL':
      return state;
    case 'TUTORIAL_PRACTICE': {
      if (!tutorialIsActive(state.tutorialVersion, state.tutorialStep)) return state;
      const step = tutorialViewStep(state.tutorialVersion, state.tutorialStep);
      if (TUTORIAL_STEPS[step]?.id !== action.stepId) return state;
      const next = step + 1;
      return { ...state, tutorialVersion: TUTORIAL_VERSION, tutorialStep: next < TUTORIAL_STEPS.length ? next : -1,
        lastMessage: next < TUTORIAL_STEPS.length ? state.lastMessage : 'Тренировка завершена. Добро пожаловать в Эргейт.' };
    }
    case 'SKIP_TUTORIAL':
      return tutorialIsActive(state.tutorialVersion, state.tutorialStep)
        ? { ...state, tutorialVersion: TUTORIAL_VERSION, tutorialStep: -1 } : state;
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
    case 'UPGRADE_PROFILE_SKILL': {
      const skill = SKILL_DEFS.find((item) => item.id === action.skillId);
      if (!skill) return state;
      if (state.battle) return msg(state, 'Завершите бой перед улучшением навыков.');
      const skills = normalizeProfileSkills(state.profileSkills);
      const level = skills[skill.id];
      if (level >= SKILL_MAX_LEVEL) return msg(state, 'Навык уже достиг максимального уровня.');
      const cost = skillCost(level);
      if (state.bullets < cost) return msg(state, `Нужно ${cost} патронов на навык «${skill.name}».`);
      return {
        ...state,
        bullets: state.bullets - cost,
        profileSkills: { ...skills, [skill.id]: level + 1 },
        lastMessage: `Навык «${skill.name}» улучшен до ${level + 1} уровня.`,
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
    case 'BUY_SHOP_ITEM':
    case 'EQUIP_SHOP_WEAPON':
    case 'BUY_EQUIPMENT':
      return reduceInventory(state, action);
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
    case 'START_ARENA':
    case 'ARENA_SKILL':
    case 'CLOSE_ARENA_BATTLE':
      return reduceArena(state, action);
    case 'START_BOSS':
    case 'START_BOSS_FIGHT':
    case 'START_GAST':
    case 'OPEN_BATTLE':
    case 'BOSS_TICK':
    case 'BUY_BOSS_ATTACK':
    case 'CLAIM_ROOM':
    case 'BOSS_SKILL':
    case 'BATTLE_ATTACK':
    case 'BATTLE_GRENADES':
    case 'BATTLE_HEAL':
    case 'BATTLE_POWER':
    case 'BATTLE_COMBO':
    case 'BATTLE_BLOCK':
    case 'BATTLE_EVADE':
    case 'INVITE_FRIEND':
    case 'LEAVE_BATTLE':
    case 'ABANDON_BOSS':
      return reduceBattle(state, action);
    case 'OPEN_MAP_RAID':
    case 'START_RAID':
    case 'RAID_SCOUT':
    case 'RAID_BYPASS':
    case 'RAID_LOOT':
    case 'LEAVE_RAID':
      return reduceRaid(state, action);
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
      if (state.gold < CLAN_CREATE_GOLD) return msg(state, `Нужно 💰 ${CLAN_CREATE_GOLD} припасов.`);
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
        experience: state.experience + quest.rewardExperience,
        daily: {
          ...state.daily,
          quests: state.daily.quests.map((qp) =>
            qp.questId === action.questId ? { ...qp, claimed: true } : qp
          ),
        },
        lastMessage: `Квест «${quest.name}» выполнен! +${quest.rewardBullets} патронов, +${quest.rewardMatches} спичек, +${quest.rewardGrenades} гранат, +${quest.rewardGold} припасов, +${quest.rewardExperience} опыта.`,
      };
    }
    case 'CLAIM_LOGIN_REWARD': {
      const loginRewards = normalizeLoginRewards(state.loginRewards);
      const status = loginRewardStatus(loginRewards);
      if (!status.available) return msg(state, 'Награда за сегодняшний вход уже получена.');
      const reward = LOGIN_REWARDS[status.day - 1];
      return {
        ...state,
        bullets: state.bullets + reward.bullets,
        gold: state.gold + reward.gold,
        matches: state.matches + reward.matches,
        medkits: state.medkits + reward.medkits,
        loginRewards: { lastClaimDate: status.today, streak: status.day },
        lastMessage: `Награда за вход · день ${status.day}: +${reward.bullets} патронов${reward.gold ? `, +${reward.gold} припасов` : ''}${reward.matches ? `, +${reward.matches} спичек` : ''}${reward.medkits ? `, +${reward.medkits} аптечек` : ''}.`,
      };
    }
    case 'CLAIM_DAILY_QUEST_BONUS': {
      if (state.daily.questBonusClaimed || !DAILY_QUESTS.every((quest) => state.daily.quests.some((progress) => progress.questId === quest.id && progress.completed))) {
        return msg(state, 'Ящик доступен после выполнения всех заданий и выдаётся один раз в день.');
      }
      return { ...state, bullets: state.bullets + 100, gold: state.gold + 50, medkits: state.medkits + 1,
        daily: { ...state.daily, questBonusClaimed: true },
        lastMessage: 'Ящик контрактов: +100 патронов, +50 припасов, +1 аптечка.' };
    }
    case 'EQUIP_ITEM':
    case 'UNEQUIP_ITEM':
    case 'CRAFT_ITEM':
      return reduceInventory(state, action);
    case 'TOGGLE_SOUND':
      return { ...state, soundEnabled: !state.soundEnabled };
    case 'TOGGLE_MAP':
      return { ...state, showMap: !state.showMap };
    case 'TOGGLE_BOSS_MODAL':
      return { ...state, showBossModal: !state.showBossModal };
    case 'TOGGLE_CLAN_MODAL':
      return { ...state, showClanModal: !state.showClanModal };
    case 'MINIMIZE_RAID':
    case 'CHECK_RAIDS':
      return reduceRaid(state, action);
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
    case 'CANCEL_RAID':
    case 'CLAIM_RAID_REWARD':
    case 'OPEN_RAID_TASKS':
    case 'CLOSE_RAID_TASKS':
    case 'COMPLETE_RAID_TASKS':
      return reduceRaid(state, action);
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
      if (state.caps < item.price) return msg(state, `Не хватает крышек: нужно ${item.price} 🥤.`);
      const caps = state.caps - item.price;

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
