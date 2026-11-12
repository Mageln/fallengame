import { msg, spend, recordResources, recordClanEvent } from './reducerShared';
import { RAIDS, INVENTORY_ITEMS, DAILY_QUESTS } from './constants';
import { lootDrop } from './formulas';
import { mapRaidExperience, RAID_LOOT_EXPERIENCE } from './experience';
import { RAID_DANGER_TASKS, RAID_TASK_GOLD_PRICE } from './survival';
import type { GameAction, GameNotification, GameState } from './types';

type RaidAction = Extract<GameAction, { type: 'OPEN_MAP_RAID' | 'START_RAID' | 'RAID_SCOUT' | 'RAID_BYPASS' | 'RAID_LOOT' | 'LEAVE_RAID' | 'MINIMIZE_RAID' | 'CHECK_RAIDS' | 'CANCEL_RAID' | 'CLAIM_RAID_REWARD' | 'OPEN_RAID_TASKS' | 'CLOSE_RAID_TASKS' | 'COMPLETE_RAID_TASKS' }>;

export const reduceRaid = (state: GameState, action: RaidAction): GameState => {
  switch (action.type) {
    case 'OPEN_MAP_RAID': {
      const raid = state.mapRaids.find((entry) => entry.id === action.raidId);
      if (!raid) return state;
      return {
        ...state,
        showRaidModal: true,
        activeRaidId: raid.id,
        raidTasks: raid.isRunning ? { raidId: raid.id, completedIds: state.raidTaskProgress[raid.id] ?? [], open: false } : null,
        lastMessage: raid.isRunning ? `${raid.name}: рейд уже начат.` : raid.completed ? `${raid.name}: награда получена. Можно начать рейд заново.` : `${raid.name}: нажмите «Начать рейд».`,
      };
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
        if (state.carLevel < (mapRaid.requiredCarLevel ?? 1)) {
          return msg(state, `Для рейда «${mapRaid.name}» нужна машина ${mapRaid.requiredCarLevel} уровня.`);
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
        experience: state.experience + RAID_LOOT_EXPERIENCE,
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
        lastMessage: `${raid.name}: ящики собраны. +${RAID_LOOT_EXPERIENCE} опыта, +${raid.matches * bonus} спичек, гранаты и аптечки.${dropMsg}`,
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
        experience: state.experience + mapRaidExperience(raid.type),
        matches: state.matches + raid.rewards.matches,
        keys: state.keys + raid.rewards.materials,
        raidTasks: state.raidTasks?.raidId === raid.id ? { ...state.raidTasks, open: false } : state.raidTasks,
        mapRaids: state.mapRaids.map((r) =>
          r.id === action.raidId ? { ...r, isRunning: false, completed: true, startTime: undefined, endTime: undefined } : r
        ),
        lastMessage: `${raid.name}: +${mapRaidExperience(raid.type)} опыта, +${raid.rewards.matches} спичек из рейда. Чтобы повторить рейд, нажмите «Начать рейд».`,
      }, 'raid', { matches: raid.rewards.matches });
      const quest = DAILY_QUESTS.find((entry) => entry.id === 'q3');
      const updated = { ...collected, daily: { ...collected.daily, quests: collected.daily.quests.map((progress) =>
        progress.questId === 'q3' && !progress.claimed ? { ...progress, progress: quest?.target ?? 1, completed: true } : progress) } };
      return recordClanEvent(updated, 'raid');
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
  }
};
