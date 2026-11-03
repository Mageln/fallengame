import { useEffect, useState } from 'react';
import { useGame } from '../game/GameContext';
import { BOSSES } from '../game/bosses';
import {
  BOSS_ENERGY_MAX,
  BOSS_ENERGY_PER_HIT,
  BOSS_SKILLS,
  bossAttackPrice,
  nextResetLocal,
  roomDropChance,
  todayLocal,
} from '../game/survival';
import styles from '../style/Boss.module.scss';

const remaining = (end: number, now: number): string => {
  const seconds = Math.max(0, Math.ceil((end - now) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
const remainingUntilMidnight = (end: number, now: number): string => {
  const seconds = Math.max(0, Math.ceil((end - now) / 1000));

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(remainingSeconds).padStart(2, '0'),
  ].join(':');
};
export const PremiumShop = ({ onClose }: { onClose: () => void }) => {
  const { state } = useGame();
  return <div className={styles.backdrop} onClick={onClose}><section className={styles.panel} role="dialog" aria-modal="true" aria-label="Магазин премиум-золота" onClick={(event) => event.stopPropagation()}>
    <header className={styles.header}><span className={styles.lamp} aria-hidden="true"/><div><small>ОБОРОТ ПРИПАСОВ · КАССА ЗАКРЫТА</small><h2>🪙 ПРЕМИУМ-ЗОЛОТО</h2></div><button type="button" onClick={onClose}>✕</button></header>
    <p>Баланс: 🪙 {state.premiumGold}. Премиум-золото и игровые припасы 💰 — разные валюты.</p>
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
  // У каждого босса свой дневной лимит (см. BossDef.dailyLimit).
   const entries = state.bossAttacks.date === todayLocal(now)
    ? state.bossAttacks.entries
    : {};
  const entryFor = (bossId: string) => entries[bossId] ?? { used: 0, purchased: 0 };
  const buyBoss = buyBossId ? BOSSES.find((b) => b.id === buyBossId) ?? null : null;
  const buyPrice = buyBoss ? bossAttackPrice(buyBoss.dailyLimit) : 0;
  const ongoing = state.battle?.outcome === 'fighting';

  return <div className={styles.backdrop} onClick={onClose}>
    <section className={styles.panel} role="dialog" aria-modal="true" aria-label="Список боссов" onClick={(event) => event.stopPropagation()}>
      <header className={styles.header}><span className={styles.lamp} aria-hidden="true" /><div><small>ЗАПРЕТНАЯ ЗОНА · СИГНАЛ 03</small><h2>БОССЫ РАЗРУШЕННОГО ГОРОДА</h2></div><button type="button" onClick={onClose} aria-label="Закрыть">✕</button></header>
      <div className={styles.wallet}><span>🥤 Крышки: {state.caps}</span><span>💰 Припасы: {state.gold}</span><span>
  Обновление: {remainingUntilMidnight(nextResetLocal(now), now)} до местной полуночи
</span></div>
      {ongoing && <button type="button" className={styles.primary} onClick={() => dispatch({ type: 'OPEN_BATTLE' })}>↩ ВЕРНУТЬСЯ В ТЕКУЩИЙ БОЙ</button>}
      <div className={styles.roster}>
        {BOSSES.filter((boss) => ['1', '2', '3', '4'].includes(boss.id)).map((boss) => {
          const entry = entryFor(boss.id);
          const total = boss.dailyLimit + entry.purchased;
          const left = Math.max(0, total - entry.used);
          const exhausted = left <= 0;
          const price = bossAttackPrice(boss.dailyLimit);
          return <article key={boss.id} className={styles.bossCard}>
            <div className={styles.bossPortrait}><img src="/enemy/avatar-boss.jpg" alt="" /></div><div className={styles.bossInfo}><h3>{boss.name}</h3><p>{boss.description}</p><span>☠ {boss.hp} HP · 🔫 пули при победе · 🎁 комната </span><span>⚔ Нападения: {left}/{total} · докупка 🥤 {price}</span></div>
            {exhausted
              ? <button type="button" disabled={!!state.battle} title={state.battle ? 'Сначала завершите текущий бой' : undefined} onClick={() => setBuyBossId(boss.id)}>🥤 КУПИТЬ АТАКУ · {price}</button>
              : <button type="button" disabled={!!state.battle || state.health <= 0} title={state.battle ? 'Сначала завершите текущий бой' : state.health <= 0 ? 'Восстановите HP' : undefined} onClick={() => dispatch({ type: 'START_BOSS_FIGHT', bossId: boss.id })}>НАПАСТЬ · {left}/{total}</button>}
          </article>;
        })}
      </div>
      {state.pendingRoomDrop && <p className={styles.notice}>🎁 Найдена комната! Откройте раздел «Комната», чтобы забрать её.</p>}
      {state.lastMessage && <p className={styles.notice} role="status">{state.lastMessage}</p>}
    </section>
    {buyBoss && <div className={styles.overlay} onClick={(event) => { event.stopPropagation(); setBuyBossId(null); }}><section className={styles.paper} role="dialog" aria-modal="true" aria-label="Купить атаку" onClick={(event) => event.stopPropagation()}><span className={styles.tape} aria-hidden="true"/><small>ЗАПИСКА ТОРГОВЦА</small><h3>КУПИТЬ АТАКУ · {buyBoss.name}</h3><p>Дополнительное нападение на «{buyBoss.name}» действует сегодня. Цена: 🥤 {buyPrice} крышек. У вас {state.caps}.</p><div className={styles.actions}><button type="button" disabled={state.caps < buyPrice} onClick={() => { dispatch({ type: 'BUY_BOSS_ATTACK', bossId: buyBoss.id }); setBuyBossId(null); }}>ПОДТВЕРДИТЬ</button><button type="button" onClick={() => setBuyBossId(null)}>ОТМЕНА</button></div>{state.caps < buyPrice && <p>Тестовый режим: пополните крышки кнопкой «+» в убежище. Позже здесь будет оплата через донат.</p>}</section></div>}
  </div>;
};

export const BossFightPanel = () => {
  const { state, dispatch } = useGame();
  const battle = state.battle;
  const [now, setNow] = useState(Date.now());
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
      <div className={styles.wallet}><span>❤️ HP {battle.playerHp}/{battle.playerMaxHp}</span><span>⚡ Энергия задания {state.energy}</span><span>🔫 Пули {state.bullets}</span><span>🎟️ Жетоны {state.zhetons}</span><span>🪙 Премиум {state.premiumGold}</span></div>
      <div className={styles.arena}>
        <div>
          <img src="/pers2.jpg" alt="Ваш персонаж" />

          <span className={styles.energyLabel}>
            ⚡ {battle.bossEnergy ?? 0}/{BOSS_ENERGY_MAX}
          </span>

          <progress
            className={styles.bossEnergy}
            max={BOSS_ENERGY_MAX}
            value={battle.bossEnergy ?? 0}
            aria-label="Боевая энергия"
          />

          <strong>{state.playerName || 'Выживший'}</strong>

          <progress
            max={battle.playerMaxHp}
            value={battle.playerHp}
            aria-label="HP игрока"
          />
        </div>
        <div className={styles.arenaStatus}><span className={styles.timer}>⏱ {remaining(battle.endsAt, now)}</span><span>УРОН: {battle.damageDealt}</span><span>СЕРИЯ ×{battle.comboStreak}</span><span>Комната: {Math.round(chance * 100)}% / 50%</span><progress max={50} value={chance * 100} aria-label="Шанс выпадения комнаты" />{battle.lastHit && <strong key={`${battle.turn}-${battle.lastSkillId}`} className={styles.damage}>−{battle.lastHit.damage}</strong>}</div>
        <div><img src="/enemy/avatar-boss.jpg" alt={battle.bossName} /><strong>{battle.bossName}</strong><progress max={battle.bossMaxHp} value={battle.bossHp} aria-label="HP босса" /></div>
      </div>
      {isActive ? <>        <button
          type="button"
          className={styles.powerAttack}
          disabled={(battle.bossEnergy ?? 0) < BOSS_ENERGY_MAX}
          onClick={() =>
            dispatch({
              type: 'BOSS_POWER_ATTACK',
              now: Date.now(),
            })
          }
        >
          💥 СИЛЬНЫЙ УДАР · {battle.bossEnergy ?? 0}/{BOSS_ENERGY_MAX}
        </button>

        <p className={styles.energyHint}>
          Каждый удар: +{BOSS_ENERGY_PER_HIT} боевой энергии.
          Сильный удар расходует весь заряд.
        </p>
        <div className={styles.skillGrid}>{BOSS_SKILLS.map((skill) => {
          const wait = Math.max(0, Math.ceil(((battle.skillReadyAt[skill.id] ?? 0) - now) / 1000));
          return <button type="button" key={skill.id} disabled={wait > 0 || state.bullets < skill.ammo} title={wait ? `Откат ${wait} с` : skill.ammo ? `Требуется пуль: ${skill.ammo}` : skill.name} onClick={() => dispatch({ type: 'BOSS_SKILL', skillId: skill.id, now: Date.now() })}><span>{skill.icon}</span>{skill.name}<small>{wait ? `${wait} с` : skill.ammo ? `🔫 ${skill.ammo}` : 'Кулак'}</small></button>;
        })}</div><button type="button" className={styles.exit} onClick={close}>ВЫЙТИ · БОЙ ПРОДОЛЖИТСЯ</button>
      </> : <div className={styles.results}><strong className={battle.outcome === 'won' ? styles.success : styles.failure}>{battle.outcome === 'won' ? 'БОСС ПОВЕРЖЕН' : 'БОЙ ЗАВЕРШЁН'}</strong><p>Нанесено урона: {battle.damageDealt} · пули: +{battle.reward?.bullets ?? 0}</p><p>Шанс комнаты: {Math.round(chance * 100)}% · <b>{battle.reward?.dropped ? 'ВЫПАЛО' : 'НЕ ВЫПАЛО'}</b></p>{battle.reward?.room && <p>🎁 Найдена комната! Заберите её на экране «Комната».</p>}<button type="button" onClick={close}>{battle.outcome === 'won' ? 'ЗАБРАТЬ НАГРАДУ' : 'ЗАКРЫТЬ'}</button></div>}
      <div className={styles.battleLog} role="log" aria-live="polite"><h3>ЖУРНАЛ УРОНА</h3>{battle.log.slice(-4).map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}</div>
      {state.lastMessage && <p className={styles.notice} role="status">{state.lastMessage}</p>}
    </section>
  </div>;
};
