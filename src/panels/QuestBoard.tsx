import { ResourceIcon, ResourceText } from '../components/ResourceIcon';
import { QuestIcon, QuestChestIcon } from '../components/QuestIcon';
import { useEffect } from 'react';
import { useGame } from '../game/GameContext';
import { DAILY_QUESTS, DISTRICT_TASKS } from '../game/constants';
import { getDistrict } from '../game/formulas';
import styles from '../style/QuestBoard.module.scss';


export const QuestBoard = ({ onClose }: { onClose: () => void }) => {
  const { state, dispatch } = useGame();
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  const done = DAILY_QUESTS.filter((quest) => state.daily.quests.some((item) => item.questId === quest.id && item.completed)).length;
  const ready = done === DAILY_QUESTS.length;
  return <div className={styles.backdrop} onClick={onClose}>
    <section className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="quest-title" onClick={(event) => event.stopPropagation()}>
      <header className={styles.header}><span className={styles.lamp} aria-hidden="true" /><div><small>РАЦИЯ · ДОСКА КОНТРАКТОВ</small><h2 id="quest-title">ЗАДАНИЯ ВЫЖИВШЕГО</h2><p>Каждый день — новый шанс подготовиться к выходу.</p></div><button type="button" onClick={onClose} aria-label="Закрыть задания">✕</button></header>
      <section className={styles.districtTasks} aria-label="Задания района">
        <div><small>ВЫЛАЗКИ · {getDistrict(state.currentDistrict)?.name ?? 'РАЙОН'}</small><h3>ЗАДАНИЯ РАЙОНА</h3><p>Расходуют энергию и дают жетон.</p></div>
        {(DISTRICT_TASKS[state.currentDistrict] ?? DISTRICT_TASKS.southgate).map((task, index) => <button key={task.id} type="button"
          data-tutorial-target={index === 0 ? 'district-task' : undefined}
          disabled={state.energy < task.cost} onClick={() => dispatch({ type: 'DO_TASK', taskId: task.id })}>
          <span>{task.name}</span><span><ResourceIcon name="energy" /> {task.cost} · <ResourceIcon name="tokens" /> +1</span>
        </button>)}
      </section>
      <div className={styles.overview}><div><small>СЕГОДНЯШНИЕ КОНТРАКТЫ</small><strong>{done} / {DAILY_QUESTS.length} ВЫПОЛНЕНО</strong></div><div><small>ОБНОВЛЕНИЕ</small><strong>В ПОЛНОЧЬ ПО ВРЕМЕНИ УСТРОЙСТВА</strong></div></div>
      <progress className={styles.totalProgress} value={done} max={DAILY_QUESTS.length} aria-label="Выполненные задания" />
      <div className={styles.list}>{DAILY_QUESTS.map((quest) => {
        const item = state.daily.quests.find((entry) => entry.questId === quest.id);
        if (!item) return null;
        return <article className={`${styles.card} ${item.completed ? styles.completed : ''}`} key={quest.id}>
          <div className={styles.icon} aria-hidden="true"><QuestIcon questId={quest.id} /></div><div className={styles.details}>
            <div className={styles.title}><h3>{quest.name}</h3><span>{item.claimed ? 'ПОЛУЧЕНО' : item.completed ? 'ГОТОВО' : 'В ПРОЦЕССЕ'}</span></div><p>{quest.description}</p>
            <div className={styles.progressText}><span>ПРОГРЕСС</span><strong>{item.progress} / {quest.target}</strong></div><progress value={item.progress} max={quest.target} aria-label={`Прогресс: ${quest.name}`} />
            <div className={styles.rewards}><small>НАГРАДА:</small>{quest.rewardBullets > 0 && <span><ResourceIcon name="bullets" /> {quest.rewardBullets}</span>}{quest.rewardMatches > 0 && <span><ResourceIcon name="matches" /> {quest.rewardMatches}</span>}{quest.rewardGrenades > 0 && <span><ResourceIcon name="grenades" /> {quest.rewardGrenades}</span>}{quest.rewardGold > 0 && <span><ResourceIcon name="supplies" /> {quest.rewardGold} припасов</span>}{quest.rewardExperience > 0 && <span><ResourceIcon name="experience" /> {quest.rewardExperience} опыта</span>}</div>
          </div><button className={styles.claim} type="button" disabled={!item.completed || item.claimed} onClick={() => dispatch({ type: 'CLAIM_QUEST_REWARD', questId: quest.id })}>{item.claimed ? 'ПОЛУЧЕНО' : 'ЗАБРАТЬ'}</button>
        </article>;
      })}</div>
      <div className={styles.bonus}><div className={styles.bonusIcon} aria-hidden="true"><QuestChestIcon /></div><div><small>ОСОБАЯ НАГРАДА</small><h3>ЯЩИК ЗА ВСЕ КОНТРАКТЫ</h3><p>Выполните все шесть заданий: <ResourceIcon name="bullets" /> 100 патронов · <ResourceIcon name="supplies" /> 50 припасов · <ResourceIcon name="medkits" /> 1 аптечка</p></div><button type="button" disabled={!ready || state.daily.questBonusClaimed} onClick={() => dispatch({ type: 'CLAIM_DAILY_QUEST_BONUS' })}>{state.daily.questBonusClaimed ? 'ПОЛУЧЕНО' : 'ЗАБРАТЬ ЯЩИК'}</button></div>
      {state.lastMessage && <p className={styles.notice} role="status"><ResourceText text={state.lastMessage} /></p>}
    </section>
  </div>;
};
