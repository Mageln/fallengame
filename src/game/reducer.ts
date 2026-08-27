import {
  CLAN_CREATE_GOLD,
  CLAN_CREATE_LEVEL,
  CLAN_JOIN_LEVEL,
  DAILY_GOLD,
  DISTRICT_TASKS,
  DISTRICTS,
  LEVEL_GOLD,
  RAIDS,
  SHOP,
  TUTORIAL,
  WEAPON_BREAK_CHANCE,
  WEAPON_MAX_LEVEL,
  INVENTORY_ITEMS,
  CRAFTING_RECIPES,
  DAILY_QUESTS,
} from './constants';
import {
  canEnterDistrict,
  carUpgradeCost,
  critChance,
  dateKey,
  getDistrict,
  levelUpCost,
  luckUpgradeCost,
  lootDrop,
  staminaUpgradeCost,
  totalDamage,
  totalStamina,
  weaponRepairCost,
  weaponUpgradeCost,
  weaponUpgradeUpgradeCost,
  weekKey,
} from './formulas';
import { BattleState, GameAction, GameState } from './types';

const msg = (state: GameState, lastMessage: string): GameState => ({ ...state, lastMessage });

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
  if (state.daily.dateKey === today) return rollGast(state);
  return rollGast({
    ...state,
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
    lastMessage: 'Новый день в Эргейте. Заберите золото за вход и квесты обновлены.',
  });
};

const startBattle = (
  state: GameState,
  bossId: string,
  bossName: string,
  bossHp: number,
  source: BattleState['source']
): GameState => {
  if (state.weapon.broken) {
    return msg(state, 'Оружие сломано — урон не учитывается. Почините его в Мастерской.');
  }
  const hp = totalStamina(state);
  return {
    ...state,
    battle: {
      bossId,
      bossName,
      bossHp,
      bossMaxHp: bossHp,
      playerHp: hp,
      playerMaxHp: hp,
      log: [`Бой: ${bossName}`],
      friends: [],
      source,
      shakeTimer: 0,
      flashTimer: 0,
      damageNumber: null,
    },
  };
};

const afterPlayerHit = (state: GameState, battle: BattleState, damage: number, note: string): GameState => {
  const nextHp = Math.max(0, battle.bossHp - damage);
  const log = [...battle.log, note];
  if (nextHp <= 0) {
    const bullets = 12 + Math.floor(Math.random() * 10);
    const keys = 1;
    const zhetons = battle.source === 'gast' ? 8 : 2;
    const gold = battle.source === 'gast' ? 5 : 0;
    return {
      ...state,
      bullets: state.bullets + bullets,
      keys: state.keys + keys,
      zhetons: state.zhetons + zhetons,
      gold: state.gold + gold,
      gast: battle.source === 'gast' ? { ...state.gast, active: false, districtId: null } : state.gast,
      battle: null,
      lastMessage: `${battle.bossName} повержен. +${bullets} патронов, ключ, жетоны.`,
    };
  }

  const bossHit = 6 + Math.floor(battle.bossMaxHp / 40);
  const playerHp = Math.max(0, battle.playerHp - bossHit);
  log.push(`${battle.bossName} бьёт на ${bossHit}`);
  if (playerHp <= 0) {
    return {
      ...state,
      battle: null,
      lastMessage: 'Вы выбыли из боя. Нужны аптечки и выносливость.',
    };
  }

  return {
    ...state,
    battle: { ...battle, bossHp: nextHp, playerHp, log },
  };
};

const maybeBreakWeapon = (state: GameState): GameState => {
  if (state.weapon.broken) return state;
  if (Math.random() > WEAPON_BREAK_CHANCE) return state;
  return {
    ...state,
    weapon: { ...state.weapon, broken: true },
    lastMessage: 'Оружие сломалось. Урон от него больше не считается, пока не почините в Мастерской.',
  };
};

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
  if (normalized.weapon && typeof normalized.weapon.upgraded === 'undefined') {
    normalized = {
      ...normalized,
      weapon: { ...normalized.weapon, upgraded: false },
    };
  }
  if (typeof normalized.soundEnabled === 'undefined') {
    normalized = { ...normalized, soundEnabled: true };
  }
  
  return applyDailyReset(normalized);
};

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
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
        bullets: next.bullets + task.bullets,
        matches: next.matches + task.matches,
        lastMessage: `${task.name}: +${task.bullets} патронов, +${task.matches} спичек.`,
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
      return result;
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
    case 'START_GAST': {
      if (!state.gast.active || !state.gast.districtId) {
        return msg(state, 'Гаст сейчас не появился. Он ходит 1–2 раза в неделю.');
      }
      return startBattle(state, 'gast', 'Гаст', 900, 'gast');
    }
    case 'BATTLE_ATTACK': {
      if (!state.battle) return state;
      const crit = Math.random() < critChance(state);
      let damage = totalDamage(state);
      if (action.technique) damage = Math.floor(damage * 1.35);
      if (crit) damage *= 2;
      const broken = maybeBreakWeapon(state);
      const note = `${action.technique ? 'Приём' : 'Удар'} ${damage}${crit ? ' (крит удачи)' : ''}${broken.weapon.broken && !state.weapon.broken ? '. Оружие сломалось' : ''}`;
      
      // Update quest progress for kill_boss
      let next = broken;
      const battle = broken.battle ?? state.battle;
      if (battle.bossHp - damage <= 0) {
        // Boss killed - update kill quests
        next = {
          ...next,
          daily: {
            ...next.daily,
            quests: next.daily.quests.map((qp) => {
              if (qp.questId === 'q1' || qp.questId === 'q6') {
                const quest = DAILY_QUESTS.find((q) => q.id === qp.questId);
                const newProgress = Math.min(quest?.target ?? Infinity, qp.progress + 1);
                return { ...qp, progress: newProgress, completed: newProgress >= (quest?.target ?? 0) };
              }
              if (qp.questId === 'q8') {
                // Count medkits used (approximate)
                return qp;
              }
              return qp;
            }),
          },
        };
      }
      
      return afterPlayerHit(next, next.battle ?? battle, damage, note);
    }
    case 'BATTLE_GRENADES': {
      if (!state.battle) return state;
      if (state.grenades < action.count) return msg(state, 'Не хватает гранат.');
      const damage = action.count * 12;
      return afterPlayerHit(
        { ...state, grenades: state.grenades - action.count },
        state.battle,
        damage,
        `Гранаты x${action.count}: ${damage}`
      );
    }
    case 'BATTLE_HEAL': {
      if (!state.battle) return state;
      if (state.medkits <= 0) return msg(state, 'Нет аптечек.');
      const heal = 35;
      const playerHp = Math.min(state.battle.playerMaxHp, state.battle.playerHp + heal);
      return {
        ...state,
        medkits: state.medkits - 1,
        battle: {
          ...state.battle,
          playerHp,
          log: [...state.battle.log, `Аптечка +${heal} HP`],
        },
      };
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
    case 'LEAVE_BATTLE':
      return { ...state, battle: null };
    case 'START_RAID': {
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
        zhetons: state.zhetons + 3 * bonus,
        raid: { ...state.raid, cratesLooted: true },
      };
      // Loot drop from crates
      const district = getDistrict(state.currentDistrict);
      const drops = lootDrop(district?.carLevel ?? 1);
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
        lastMessage: `${raid.name}: ящики собраны. Спички, гранаты, аптечки, жетоны.${dropMsg}`,
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
      return next;
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
    case 'JOIN_CLAN': {
      if (state.clan) return msg(state, 'Вы уже в клане.');
      if (state.level < CLAN_JOIN_LEVEL) return msg(state, `Вступить можно с ${CLAN_JOIN_LEVEL} уровня.`);
      return {
        ...state,
        clan: { name: 'Стена Эргейта', score: state.level * 10, members: 48 },
        lastMessage: 'Вступили в клан. Очки клана — сумма опыта участников.',
      };
    }
    case 'CREATE_CLAN': {
      if (state.clan) return msg(state, 'Вы уже в клане.');
      if (state.level < CLAN_CREATE_LEVEL) return msg(state, `Создать клан можно с ${CLAN_CREATE_LEVEL} уровня.`);
      if (state.gold < CLAN_CREATE_GOLD) return msg(state, `Создание клана: ${CLAN_CREATE_GOLD} золота.`);
      const name = action.name.trim() || 'Клан';
      return {
        ...state,
        gold: state.gold - CLAN_CREATE_GOLD,
        clan: { name, score: state.level * 10, members: 1 },
        lastMessage: `Клан «${name}» создан. Максимум 300 человек.`,
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
          const countInInventory = state.inventory
            .filter((s) => s.itemId === cost.itemId)
            .reduce((sum, s) => sum + 1, 0);
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
      // Add crafted item
      const craftedItem = INVENTORY_ITEMS.find((i) => i.id === recipe.resultItemId);
      if (!craftedItem) return msg(state, 'Ошибка крафта: результат не найден.');
      next = {
        ...next,
        inventory: [...next.inventory, { itemId: recipe.resultItemId, equipped: false }],
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
      return next;
    }
    case 'TOGGLE_SOUND':
      return { ...state, soundEnabled: !state.soundEnabled };
    default:
      return state;
  }
};
