import { useEffect, useState } from 'react';
import { useGame } from '../game/GameContext';
import { RAID_DANGER_TASKS, RAID_TASK_GOLD_PRICE } from '../game/survival';
import styles from '../style/RaidModal.module.scss';

interface RaidModalProps {
  raidId: string;
  onClaim: () => void;
  onCancel: () => void;
  onMinimize: () => void;
}

const formatTime = (ms: number): string => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

export const RaidModal = ({ raidId, onClaim, onCancel, onMinimize }: RaidModalProps) => {
  const { state, dispatch } = useGame();
  const [now, setNow] = useState(Date.now());
  const raid = state.mapRaids.find((entry) => entry.id === raidId);
  const tasks = state.raidTasks?.raidId === raidId ? state.raidTasks : null;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!raid) return null;
  const completed = !!raid.endTime && now >= raid.endTime;
  const duration = raid.endTime && raid.startTime ? raid.endTime - raid.startTime : 1;
  const progress = Math.min(100, Math.max(0, ((now - (raid.startTime ?? now)) / duration) * 100));
  const done = tasks?.completedIds.length ?? 0;
  const remaining = RAID_DANGER_TASKS.filter((task) => !tasks?.completedIds.includes(task.id));
  const affordableEnergy = remaining.some((task) => state.energy >= task.energy);
  const close = () => {
    if (tasks?.open) dispatch({ type: 'CLOSE_RAID_TASKS' });
    else onMinimize();
  };

  return <div className={styles.backdrop} onClick={close}>
    <section className={styles.panel} role="dialog" aria-modal="true" aria-label={`Рейд: ${raid.name}`} onClick={(event) => event.stopPropagation()}>
      <header><span className={styles.lamp} aria-hidden="true"/><div><small>{raid.type === 'red' ? 'КРАСНАЯ ЗОНА · УГРОЗА' : 'ЖЁЛТАЯ ЗОНА · ВЫЛАЗКА'}</small><h2>{raid.name}</h2></div><button type="button" onClick={close} aria-label="Свернуть рейд">─</button></header>
      <p>{raid.description} · Рейд продолжается после сворачивания.</p>
      <strong className={styles.timer}>{completed ? '✅ ГОТОВО' : `⏱ ${formatTime((raid.endTime ?? now) - now)}`}</strong>
      <div className={styles.progressLabel}><span>Время рейда</span><strong>{Math.round(progress)}%</strong></div>
      <progress value={progress} max={100} aria-label="Ход рейда" />
      <div className={styles.rewards}><span>🪵 +{raid.rewards.matches} спичек</span><span>⚙ +{raid.rewards.materials} материалов</span><span>🎟️ Опасные задания: {done}/{RAID_DANGER_TASKS.length}</span></div>
      <button type="button" className={styles.taskButton} onClick={() => dispatch({ type: 'OPEN_RAID_TASKS', raidId })}>☢ ЗАДАНИЯ В РЕЙДЕ · {done}/{RAID_DANGER_TASKS.length}</button>
      <div className={styles.actions}>
        {completed ? <button type="button" className={styles.primary} onClick={onClaim}>ЗАБРАТЬ НАГРАДУ</button>
          : <button type="button" onClick={onCancel}>ОТМЕНИТЬ РЕЙД (ВОЗВРАТ 50% ЭНЕРГИИ)</button>}
        <button type="button" onClick={onMinimize}>СВЕРНУТЬ</button>
      </div>
      {state.lastMessage && <p role="status" className={styles.notice}>{state.lastMessage}</p>}
    </section>
    {tasks?.open && <div className={styles.taskBackdrop} onClick={(event) => { event.stopPropagation(); dispatch({ type: 'CLOSE_RAID_TASKS' }); }}>
      <section className={styles.taskPanel} role="dialog" aria-modal="true" aria-label="Опасные задания рейда" onClick={(event) => event.stopPropagation()}>
        <span className={styles.tape} aria-hidden="true"/><small>ЗАПИСКА · ОПАСНОСТЬ РЕЙДА</small><h2>☢ ЗАДАНИЯ В РЕЙДЕ</h2>
        <p>Выполняйте оставшиеся задания за энергию по порядку или сразу все за премиум-золото. Повторные награды запрещены.</p>
        <div className={styles.progressLabel}><span>Выполнено</span><strong>{done}/{RAID_DANGER_TASKS.length}</strong></div>
        <progress value={done} max={RAID_DANGER_TASKS.length} aria-label="Выполненные задания" />
        <ul>{RAID_DANGER_TASKS.map((task) => <li key={task.id}>
          <span>{tasks.completedIds.includes(task.id) ? '✓' : '☠'}</span><div><strong>{task.title}</strong><small>⚡ {task.energy} · 🎟️ +{task.tokens} · ❤️ +{task.hp} HP</small></div>
          <span>{tasks.completedIds.includes(task.id) ? 'ВЫПОЛНЕНО' : 'НЕ ПРОЙДЕНО'}</span>
        </li>)}</ul>
        <div className={styles.rewards}><span>⚡ Энергия: {state.energy}</span><span>🪙 Золото: {state.premiumGold}</span><span>❤️ HP: {state.health}/{state.maxHealth}</span></div>
        <div className={styles.actions}>
          <button type="button" disabled={!remaining.length || !affordableEnergy} onClick={() => dispatch({ type: 'COMPLETE_RAID_TASKS', raidId, mode: 'energy' })}>⚡ ВЫПОЛНИТЬ ЗА ЭНЕРГИЮ</button>
          <button type="button" className={styles.primary} disabled={!remaining.length || state.premiumGold < RAID_TASK_GOLD_PRICE} onClick={() => dispatch({ type: 'COMPLETE_RAID_TASKS', raidId, mode: 'gold' })}>🪙 ВСЁ ЗА {RAID_TASK_GOLD_PRICE} ЗОЛОТА</button>
          <button type="button" onClick={() => dispatch({ type: 'CLOSE_RAID_TASKS' })}>ЗАКРЫТЬ</button>
        </div>
        {state.lastMessage && <p role="status" className={styles.notice}>{state.lastMessage}</p>}
      </section>
    </div>}
  </div>;
};
