import { ResourceIcon, ResourceText } from '../components/ResourceIcon';
import { useEffect, useState } from 'react';
import { useGame } from '../game/GameContext';
import { ARENA_DAILY_LIMIT, ARENA_OPPONENTS, ARENA_TURN_LIMIT, arenaAttemptsLeft, emptyArena } from '../game/arena';
import { BOSS_ENERGY_MAX, BOSS_ENERGY_PER_HIT, BOSS_SKILLS } from '../game/survival';
import styles from '../style/Boss.module.scss';

export const Arena = ({ onClose }: { onClose: () => void }) => {
  const { state, dispatch } = useGame();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const arena = state.arena ?? emptyArena();
  const battle = arena.battle;
  const attempts = arenaAttemptsLeft(arena, now);
  const fighting = battle?.outcome === 'fighting';
  return <div className={styles.backdrop}>
    <section className={`${styles.panel} ${styles.fight}`} role="dialog" aria-modal="true" aria-labelledby="arena-title">
      <header className={styles.header}><span className={styles.lamp} aria-hidden="true" /><div><small>БОЙЦОВСКИЙ КЛУБ · ПРОТИВ БОТОВ</small><h2 id="arena-title">⚔ АРЕНА ВЫЖИВШИХ</h2></div><button type="button" onClick={onClose} aria-label="Закрыть арену">✕</button></header>
      <div className={styles.wallet}><span>⚔ Попытки: {attempts}/{ARENA_DAILY_LIMIT}</span><span>⏱ Обновление в 00:00 UTC</span><span><ResourceIcon name="supplies" /> {state.gold} припасов</span><span><ResourceIcon name="bullets" /> {state.bullets} патронов</span></div>
      {!battle ? <>
        <p className={styles.notice}>Выбирайте противника: его здоровье подстраивается под вашу силу. Арена использует отдельное здоровье и боевую энергию; патроны и прочность оружия не расходуются.</p>
        {state.battle && <p className={styles.notice}>Сначала завершите текущий бой.</p>}
        <div className={styles.roster}>{ARENA_OPPONENTS.map((opponent) => <article className={styles.bossCard} key={opponent.id}>
          <div className={styles.bossInfo}><h3>{opponent.name}</h3><p>{opponent.description}</p><span>Награда за победу: <ResourceIcon name="supplies" /> {opponent.gold} припасов · <ResourceIcon name="bullets" /> {opponent.bullets} патронов</span></div>
          <button type="button" disabled={attempts === 0 || !!state.battle} onClick={() => dispatch({ type: 'START_ARENA', opponentId: opponent.id })}>В БОЙ</button>
        </article>)}</div>
      </> : <>
        <div className={styles.arena}>
          <div><div className={styles.playerPortrait}><div className={styles.characterSprite}><img className={styles.characterImage} src="/pers1.png" alt="Ваш персонаж" />{state.equipmentIds.includes('shop_cap') && <img className={styles.capOverlay} src="/characters/survivor-cap-v2.png" alt="" />}</div></div><strong>{state.playerName || 'Выживший'}</strong><span>❤️ {battle.playerHp}/{battle.playerMaxHp}</span><progress max={battle.playerMaxHp} value={battle.playerHp} aria-label="Ваше здоровье"/><span className={styles.energyLabel}><ResourceIcon name="energy" /> {battle.energy}/{BOSS_ENERGY_MAX}</span><progress className={styles.bossEnergy} max={BOSS_ENERGY_MAX} value={battle.energy} aria-label="Боевая энергия" /></div>
          <div className={styles.arenaStatus}><strong>ПРОТИВ БОТА</strong><span>Ход {Math.min(battle.turn, ARENA_TURN_LIMIT)} / {ARENA_TURN_LIMIT}</span><span>Каждое действие вызывает ответ противника.</span></div>
          <div><img src="/enemy/avatar-boss.jpg" alt="" /><strong>{battle.opponentName}</strong><span>❤️ {battle.opponentHp}/{battle.opponentMaxHp}</span><progress max={battle.opponentMaxHp} value={battle.opponentHp} aria-label="Здоровье противника" /></div>
        </div>
        {fighting ? <>
          <p className={styles.energyHint}>Кулак: +{BOSS_ENERGY_PER_HIT} боевой энергии. Блок действует на ответный удар.</p>
          <div className={styles.skillGrid}>{BOSS_SKILLS.map((skill) => <button type="button" key={skill.id}
            disabled={battle.energy < skill.energyCost || (skill.id === 'weapon' && !battle.weaponAvailable) || (skill.id === 'heal' && battle.playerHp >= battle.playerMaxHp)}
            onClick={() => dispatch({ type: 'ARENA_SKILL', skillId: skill.id })}><span>{skill.icon}</span>{skill.name}<small>{skill.id === 'jab' ? `+${BOSS_ENERGY_PER_HIT}` : `−${skill.energyCost}`} <ResourceIcon name="energy" /></small></button>)}</div>
          <button type="button" className={styles.exit} onClick={() => { if (window.confirm('Отступить? Попытка будет потрачена.')) dispatch({ type: 'CLOSE_ARENA_BATTLE' }); }}>ОТСТУПИТЬ · ПОПЫТКА СГОРИТ</button>
        </> : <div className={styles.results}><strong className={battle.outcome === 'won' ? styles.success : styles.failure}>{battle.outcome === 'won' ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}</strong><p>{battle.reward ? `Награда уже зачислена: +${battle.reward.gold} припасов, +${battle.reward.bullets} патронов.` : 'В этот раз награды нет.'}</p><button type="button" onClick={() => dispatch({ type: 'CLOSE_ARENA_BATTLE' })}>К ПРОТИВНИКАМ</button></div>}
        <div className={styles.battleLog}><h3>ЖУРНАЛ БОЯ</h3><div className={styles.battleLogEntries} role="log" aria-label="Журнал боя на арене" tabIndex={0}>{battle.log.slice().reverse().map((entry, index) => <p key={`${index}-${entry}`}>{entry}</p>)}</div></div>
      </>}
      {state.lastMessage && <p className={styles.notice} role="status"><ResourceText text={state.lastMessage} /></p>}
    </section>
  </div>;
};
