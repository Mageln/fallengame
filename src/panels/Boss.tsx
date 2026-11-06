import { ResourceIcon, ResourceText } from '../components/ResourceIcon';
import { bossExperience } from '../game/experience';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useGame } from '../game/GameContext';
import { BOSSES } from '../game/bosses';
import { BOSS_ATTACK_CONFIG, BOSS_ENERGY_MAX, BOSS_ENERGY_PER_HIT, BOSS_SKILLS, bossAttackPrice, roomDropChance } from '../game/survival';
import styles from '../style/Boss.module.scss';

const remaining = (end: number, now: number): string => {
  const seconds = Math.max(0, Math.ceil((end - now) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

const remainingUntilReset = (end: number, now: number): string => {
  const seconds = Math.max(0, Math.ceil((end - now) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

export const PremiumShop = ({ onClose }: { onClose: () => void }) => {
  const { state } = useGame();
  return <div className={styles.backdrop} onClick={onClose}><section className={styles.panel} role="dialog" aria-modal="true" aria-label="Магазин премиум-золота" onClick={(event) => event.stopPropagation()}>
    <header className={styles.header}><span className={styles.lamp} aria-hidden="true"/><div><small>ОБОРОТ ПРИПАСОВ · КАССА ЗАКРЫТА</small><h2><ResourceIcon name="premium" /> ПРЕМИУМ-ЗОЛОТО</h2></div><button type="button" onClick={onClose}>✕</button></header>
    <p>Баланс: <ResourceIcon name="premium" /> {state.premiumGold}. Премиум-золото и игровые припасы <ResourceIcon name="supplies" /> — разные валюты.</p>
    <p>Покупка атак и выполнение контрактов за золото станут доступны только после подключения реального платёжного провайдера и подтверждения платежа сервером. Бесплатного начисления нет.</p>
    <button type="button" className={styles.primary} onClick={onClose}>ВЕРНУТЬСЯ</button>
  </section></div>;
};

export const BossHub = ({ onClose }: { onClose: () => void }) => {
  const { state, dispatch } = useGame();
  const [buyBossId, setBuyBossId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const resetAt = state.bossAttacks.resetAt;
  const entries = resetAt !== undefined && now >= resetAt ? {} : state.bossAttacks.entries;
  const entryFor = (bossId: string) => entries[bossId] ?? { used: 0, purchased: 0 };
  const buyBoss = buyBossId ? BOSSES.find((b) => b.id === buyBossId) ?? null : null;
  const buyPrice = buyBoss ? bossAttackPrice(buyBoss.dailyLimit) : 0;
  const battle = state.battle;

  return <div className={styles.backdrop} onClick={onClose}>
    <section className={styles.panel} role="dialog" aria-modal="true" aria-label="Список боссов" onClick={(event) => event.stopPropagation()}>
      <header className={styles.header}><span className={styles.lamp} aria-hidden="true" /><div><small>ЗАПРЕТНАЯ ЗОНА · СИГНАЛ 03</small><h2>БОССЫ РАЗРУШЕННОГО ГОРОДА</h2></div><button type="button" onClick={onClose} aria-label="Закрыть">✕</button></header>
      <div className={styles.wallet}><span><ResourceIcon name="caps" /> Крышки: {state.caps}</span><span><ResourceIcon name="supplies" /> Припасы: {state.gold}</span>{BOSS_ATTACK_CONFIG.timedLimits ? <span>{resetAt !== undefined && resetAt > now ? `Обновление через ${remainingUntilReset(resetAt, now)}` : 'Период начнётся при нападении'}</span> : <span>⚔ Без ограничений · тестовый режим</span>}</div>
      {battle?.source === 'boss' && <button type="button" className={styles.primary} onClick={() => dispatch({ type: 'OPEN_BATTLE' })}>{battle.outcome === 'fighting' ? '↩ ВЕРНУТЬСЯ В ТЕКУЩИЙ БОЙ' : '↩ ОТКРЫТЬ ИТОГИ БОЯ'}</button>}
      {battle && battle.source !== 'boss' && <p className={styles.notice}>Сначала завершите текущий бой на экране игры.</p>}
      {!battle && state.health <= 0 && <p className={styles.notice}>Недостаточно здоровья: выполните задания в рейде, чтобы восстановить HP.</p>}
      {!battle && state.weapon.broken && <p className={styles.notice}>Оружие сломано. Почините его в мастерской перед боем.</p>}
      <div className={styles.roster}>
        {BOSSES.filter((boss) => ['1', '2', '3', '4'].includes(boss.id)).map((boss) => {
          const entry = entryFor(boss.id);
          const total = boss.dailyLimit + entry.purchased;
          const left = Math.max(0, total - entry.used);
          const exhausted = BOSS_ATTACK_CONFIG.timedLimits && left <= 0;
          const price = bossAttackPrice(boss.dailyLimit);
          return <article key={boss.id} className={styles.bossCard}>
            <div className={styles.bossPortrait}><img src="/enemy/avatar-boss.jpg" alt="" /></div><div className={styles.bossInfo}><h3>{boss.name}</h3><p>{boss.description}</p><span>☠ {boss.hp} HP · ⭐ {bossExperience(boss.hp)} опыта · <ResourceIcon name="bullets" /> пули при победе · 🎁 комната </span><span>{BOSS_ATTACK_CONFIG.timedLimits ? <>⚔ Нападения: {left}/{total} · докупка <ResourceIcon name="caps" /> {price}</> : '⚔ Нападения без ограничений'}</span></div>
            {exhausted
              ? <button type="button" disabled={!!state.battle} title={state.battle ? 'Сначала завершите текущий бой' : undefined} onClick={() => setBuyBossId(boss.id)}><ResourceIcon name="caps" /> КУПИТЬ АТАКУ · {price}</button>
              : <button type="button" disabled={!!state.battle} title={state.battle ? 'Сначала завершите текущий бой' : state.health <= 0 ? 'Восстановите HP в рейде' : state.weapon.broken ? 'Почините оружие в мастерской' : undefined} onClick={() => dispatch({ type: 'START_BOSS_FIGHT', bossId: boss.id })}>НАПАСТЬ{BOSS_ATTACK_CONFIG.timedLimits ? ` · ${left}/${total}` : ''}</button>}
          </article>;
        })}
      </div>
      {state.pendingRoomDrop && <p className={styles.notice}>🎁 Найдена комната! Откройте раздел «Комната», чтобы забрать её.</p>}
      {state.lastMessage && <p className={styles.notice} role="status"><ResourceText text={state.lastMessage} /></p>}
    </section>
    {buyBoss && <div className={styles.overlay} onClick={(event) => { event.stopPropagation(); setBuyBossId(null); }}><section className={styles.paper} role="dialog" aria-modal="true" aria-label="Купить атаку" onClick={(event) => event.stopPropagation()}><span className={styles.tape} aria-hidden="true"/><small>ЗАПИСКА ТОРГОВЦА</small><h3>КУПИТЬ АТАКУ · {buyBoss.name}</h3><p>Дополнительное нападение на «{buyBoss.name}» действует до следующего обновления. Цена: <ResourceIcon name="caps" /> {buyPrice} крышек. У вас {state.caps}.</p><div className={styles.actions}><button type="button" disabled={state.caps < buyPrice} onClick={() => { dispatch({ type: 'BUY_BOSS_ATTACK', bossId: buyBoss.id }); setBuyBossId(null); }}>ПОДТВЕРДИТЬ</button><button type="button" onClick={() => setBuyBossId(null)}>ОТМЕНА</button></div>{state.caps < buyPrice && <p>Тестовый режим: пополните крышки кнопкой «+» в убежище. Позже здесь будет оплата через донат.</p>}</section></div>}
  </div>;
};

export const BossFightPanel = () => {
  const { state, dispatch } = useGame();
  const battle = state.battle;
  const [now, setNow] = useState(Date.now());
  const logRef = useRef<HTMLDivElement>(null);
  const followLog = useRef(true);
  useLayoutEffect(() => { followLog.current = true; }, [battle?.startedAt, state.battleVisible]);
  useLayoutEffect(() => {
    const log = logRef.current;
    if (log && followLog.current) log.scrollTop = log.scrollHeight;
  }, [battle?.log, battle?.startedAt, state.battleVisible]);
  useEffect(() => {
    if (!battle || !state.battleVisible || battle.source !== 'boss') return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [battle?.source, state.battleVisible]);
  if (!battle || !state.battleVisible || battle.source !== 'boss') return null;
  const chance = battle.reward?.roomChance ?? roomDropChance(battle.damageDealt);
  const isActive = battle.outcome === 'fighting';
  const close = () => dispatch({ type: 'LEAVE_BATTLE' });
  return <div className={styles.backdrop}>
    <section className={`${styles.panel} ${styles.fight}`} role="dialog" aria-modal="true" aria-label={`Бой с ${battle.bossName}`}>
      <header className={styles.header}><span className={styles.lamp} aria-hidden="true" /><div><small>АРЕНА · ЖЕРТВА МЕМОВ</small><h2>⚔ {battle.bossName}</h2></div><button type="button" onClick={close} aria-label={isActive ? 'Выйти, не останавливая бой' : 'Закрыть итоги'}>{isActive ? 'ВЫЙТИ' : '✕'}</button></header>
      <div className={styles.wallet}><span>❤️ HP {battle.playerHp}/{battle.playerMaxHp}</span><span><ResourceIcon name="energy" /> Энергия заданий {state.energy}</span><span><ResourceIcon name="bullets" /> Пули {state.bullets}</span><span><ResourceIcon name="tokens" /> Жетоны {state.zhetons}</span><span><ResourceIcon name="premium" /> Премиум {state.premiumGold}</span></div>
      <div className={styles.arena}>
        <div><div className={styles.playerPortrait}><div className={styles.characterSprite}><img className={styles.characterImage} src="/pers1.png" alt="Ваш персонаж" />{state.equipmentIds.includes('shop_cap') && <img className={styles.capOverlay} src="/characters/survivor-cap-v2.png" alt="" />}</div></div><span className={styles.energyLabel}><ResourceIcon name="energy" /> {battle.bossEnergy ?? 0}/{BOSS_ENERGY_MAX}</span><progress className={styles.bossEnergy} max={BOSS_ENERGY_MAX} value={battle.bossEnergy ?? 0} aria-label="Боевая энергия" /><strong>{state.playerName || 'Выживший'}</strong><progress max={battle.playerMaxHp} value={battle.playerHp} aria-label="HP игрока" /></div>
        <div className={styles.arenaStatus}><span className={styles.timer}>⏱ {remaining(battle.endsAt, now)}</span><span>УРОН: {battle.damageDealt}</span><span>СЕРИЯ ×{battle.comboStreak}</span>{battle.blocking && <span>🛡️ Блок активен</span>}<span>Комната: {Math.round(chance * 100)}% / 50%</span><progress max={50} value={chance * 100} aria-label="Шанс выпадения комнаты" />{battle.lastHit && <strong key={`${battle.turn}-${battle.lastSkillId}`} className={styles.damage}>−{battle.lastHit.damage}</strong>}</div>
        <div><img src="/enemy/avatar-boss.jpg" alt={battle.bossName} /><strong>{battle.bossName}</strong><progress max={battle.bossMaxHp} value={battle.bossHp} aria-label="HP босса" /></div>
      </div>
      {isActive ? <>
        <p className={styles.energyHint}>Удар кулаком: +{BOSS_ENERGY_PER_HIT} боевой энергии. Она не связана с энергией заданий.</p>
        <div className={styles.skillGrid}>{BOSS_SKILLS.map((skill) => {
          const energy = battle.bossEnergy ?? 0;
          const unavailable = energy < skill.energyCost || (skill.id === 'weapon' && state.weapon.broken) ||
            (skill.id === 'block' && battle.blocking) || (skill.id === 'heal' && battle.playerHp >= battle.playerMaxHp);
          return <button type="button" key={skill.id} disabled={unavailable} onClick={() => dispatch({ type: 'BOSS_SKILL', skillId: skill.id, now: Date.now() })}>
            <span>{skill.icon}</span>{skill.name}{skill.id === 'weapon' && <small>{state.weapon.name}</small>}
            <small>{skill.id === 'jab' ? `+${BOSS_ENERGY_PER_HIT}` : `−${skill.energyCost}`} <ResourceIcon name="energy" /></small>
          </button>;
        })}</div><button type="button" className={styles.exit} onClick={close}>ВЫЙТИ · БОЙ ПРОДОЛЖИТСЯ</button>
      </> : <div className={styles.results}><strong className={battle.outcome === 'won' ? styles.success : styles.failure}>{battle.outcome === 'won' ? 'БОСС ПОВЕРЖЕН' : 'БОЙ ЗАВЕРШЁН'}</strong><p>Нанесено урона: {battle.damageDealt} · опыт: +{battle.reward?.experience ?? 0} · пули: +{battle.reward?.bullets ?? 0}</p><p>Шанс комнаты: {Math.round(chance * 100)}% · <b>{battle.reward?.dropped ? 'ВЫПАЛО' : 'НЕ ВЫПАЛО'}</b></p>{battle.reward?.room && <p>🎁 Найдена комната! Заберите её на экране «Комната».</p>}<button type="button" onClick={close}>{battle.outcome === 'won' ? 'ЗАБРАТЬ НАГРАДУ' : 'ЗАКРЫТЬ'}</button></div>}
      <div className={styles.battleLog}>
        <h3>ЖУРНАЛ УРОНА</h3>
        <div ref={logRef} className={styles.battleLogEntries} role="log" aria-label="Журнал урона" aria-live="polite" tabIndex={0}
          onScroll={(event) => {
            const log = event.currentTarget;
            followLog.current = log.scrollHeight - log.scrollTop - log.clientHeight <= 4;
          }}>
          {battle.log.map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}
        </div>
      </div>
      {state.lastMessage && <p className={styles.notice} role="status"><ResourceText text={state.lastMessage} /></p>}
    </section>
  </div>;
};
