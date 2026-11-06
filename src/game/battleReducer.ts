import { normalizeBattle, startBattle, spendAmmo, wearWeapon, bumpKillQuests, appendBossLog, bossKilled, advanceBossClock, runRound, stunnedRound } from './battleEngine';
import { msg, recordResources, recordClanEvent } from './reducerShared';
import { SKILL_FIST_PERCENT, SKILL_WEAPON_PERCENT, SKILL_HEAL_PER_LEVEL } from './profileSkills';
import { LOCATIONS, TECHNIQUE_MUL, TECHNIQUE_COOLDOWN, POWER_MUL, POWER_PIERCE, POWER_COOLDOWN, COMBO_HITS, COMBO_HIT_MUL, COMBO_COOLDOWN } from './constants';
import { canEnterDistrict, getDistrict, weaponDamage, equipmentDamage, comboMultiplier, computeDamage, guaranteedCrit, medkitHeal } from './formulas';
import { BOSSES } from './bosses';
import { getBossAttackEntry, resetBossAttacks, setBossAttackEntry } from './bossAttacks';
import { BOSS_ATTACK_CONFIG, BOSS_ENERGY_MAX, BOSS_ENERGY_PER_HIT, BOSS_SKILLS, bossAttackPrice, roomDropChance } from './survival';
import type { BattleState, GameAction, GameState } from './types';

type BattleAction = Extract<GameAction, { type: 'START_BOSS' | 'START_BOSS_FIGHT' | 'START_GAST' | 'OPEN_BATTLE' | 'BOSS_TICK' | 'BUY_BOSS_ATTACK' | 'CLAIM_ROOM' | 'BOSS_SKILL' | 'BATTLE_ATTACK' | 'BATTLE_GRENADES' | 'BATTLE_HEAL' | 'BATTLE_POWER' | 'BATTLE_COMBO' | 'BATTLE_BLOCK' | 'BATTLE_EVADE' | 'INVITE_FRIEND' | 'LEAVE_BATTLE' }>;

export const reduceBattle = (state: GameState, action: BattleAction): GameState => {
  switch (action.type) {
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
      if (!BOSS_ATTACK_CONFIG.timedLimits) return msg(state, 'В тестовом режиме атаки не ограничены.');
      const boss = BOSSES.find((b) => b.id === action.bossId);
      if (!boss) return state;
      const current = resetBossAttacks(state);
      // Тестовый режим: покупаем за крышки. Позже здесь будет платёж через донат.
      // Цена растёт с силой босса: чем меньше у него бесплатных попыток, тем дороже докупка.
      const price = bossAttackPrice(boss.dailyLimit);
      const entry = getBossAttackEntry(current, boss.id);
      if (entry.used < boss.dailyLimit + entry.purchased) {
        return msg(current, `Сначала используйте доступные атаки на «${boss.name}».`);
      }
      if (current.caps < price) return msg(current, `Не хватает крышек 🥤: нужно ${price}.`);
      return setBossAttackEntry(
        {
          ...current,
          caps: current.caps - price,
          lastMessage: `Куплена атака на «${boss.name}» за ${price} 🥤.`,
        },
        boss.id,
        { ...entry, purchased: entry.purchased + 1 },
      );
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
      const battle = current.battle;
      if (!battle || battle.source !== 'boss' || battle.outcome !== 'fighting') return current;
      const skill = BOSS_SKILLS.find((entry) => entry.id === action.skillId);
      if (!skill) return current;
      const energy = battle.bossEnergy ?? 0;
      if (energy < skill.energyCost) return msg(current, `Для «${skill.name}» нужно ${skill.energyCost} боевой энергии.`);
      if (skill.id === 'weapon' && current.weapon.broken) return msg(current, 'Оружие сломано. Почините его в мастерской.');
      if (skill.id === 'block' && battle.blocking) return msg(current, 'Блок уже активен до следующего удара босса.');
      if (skill.id === 'heal' && battle.playerHp >= battle.playerMaxHp) return msg(current, 'Здоровье уже полное.');

      const nextEnergy = skill.id === 'jab'
        ? Math.min(BOSS_ENERGY_MAX, energy + BOSS_ENERGY_PER_HIT)
        : energy - skill.energyCost;
      if (skill.id === 'block') {
        return { ...current, battle: { ...battle, bossEnergy: nextEnergy, blocking: true,
          turn: battle.turn + 1, lastHit: null, lastSkillId: skill.id,
          log: appendBossLog(battle.log, '🛡️ Блок до следующего удара босса.') },
          lastMessage: 'Блок активен до следующего удара босса.' };
      }
      if (skill.id === 'heal') {
        const healed = Math.min(battle.playerMaxHp - battle.playerHp, medkitHeal(current) + (current.profileSkills?.heal ?? 0) * SKILL_HEAL_PER_LEVEL);
        const playerHp = battle.playerHp + healed;
        return { ...current, health: Math.min(current.maxHealth, playerHp),
          battle: { ...battle, playerHp, bossEnergy: nextEnergy, turn: battle.turn + 1,
            lastHit: null, lastSkillId: skill.id,
            log: appendBossLog(battle.log, `💚 Исцеление: +${healed} HP`) },
          lastMessage: `Исцеление: +${healed} HP.` };
      }
      const fistMultiplier = skill.id === 'jab' ? 1 + (current.profileSkills?.fist ?? 0) * SKILL_FIST_PERCENT / 100 : 1;
      const luckLevel = current.profileSkills?.luck ?? 0;
      const luckCrit = luckLevel > 0 && Math.random() < luckLevel / 100;
      const weaponBonus = skill.id === 'weapon' ? weaponDamage(current) : 0;
      const weaponMultiplier = skill.id === 'weapon' ? 1 + (current.profileSkills?.weapon ?? 0) * SKILL_WEAPON_PERCENT / 100 : 1;
      const damage = Math.min(battle.bossHp, Math.max(1, Math.round((8 + current.level / 4 + weaponBonus + equipmentDamage(current.equipmentIds)) * fistMultiplier * weaponMultiplier * (luckCrit ? 1.5 : 1))));
      const updated: BattleState = {
        ...battle, bossHp: battle.bossHp - damage, damageDealt: battle.damageDealt + damage,
        comboStreak: battle.comboStreak + 1, bossEnergy: nextEnergy, turn: battle.turn + 1,
        lastHit: { damage, crit: luckCrit, missed: false }, lastSkillId: skill.id,
        log: appendBossLog(battle.log, `${skill.icon} ${skill.name}: −${damage} HP${luckCrit ? ' (крит)' : ''}`),
      };
      return updated.bossHp <= 0
        ? bossKilled(current, updated)
        : { ...current, battle: updated, lastMessage: `${skill.name}: −${damage} HP. Шанс комнаты: ${Math.round(roomDropChance(updated.damageDealt) * 100)}%.` };
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
            experience: state.experience + (r.experience ?? 0),
            bullets: state.bullets + r.bullets,
            keys: state.keys + (r.keys ?? 0),
            zhetons: state.zhetons + r.zhetons,
            gold: state.gold + r.gold,
            gast: battle.source === 'gast' ? { ...state.gast, active: false, districtId: null } : state.gast,
            woundedBosses: wb,
            battle: null,
            battleVisible: false,
            lastMessage: `Награда за босса: +${r.experience ?? 0} опыта, +${r.bullets} пуль${r.gold ? `, +${r.gold} припасов` : ''}.${r.dropped ? ' ВЫПАЛО: найдена комната!' : ' НЕ ВЫПАЛО.'}`,
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
  }
};
