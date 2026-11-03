import { useEffect, useState } from 'react';
import { useGame } from '../game/GameContext';
import { getDistrict, levelUpCost, luckUpgradeCost, staminaUpgradeCost } from '../game/formulas';
import { LOCATIONS } from '../game/constants';
import styles from '../style/SurvivorProfile.module.scss';
import { SKILL_DEFS, SKILL_MAX_LEVEL, skillCost } from '../game/profileSkills';

type Tab = 'file' | 'training' | 'skills';
interface Props {
  onClose: () => void;
  onWorkshop: () => void;
  onBosses: () => void;
  onInventory: () => void;
  onClan: () => void;
}

const format = (n: number) => new Intl.NumberFormat('ru-RU').format(n);

export const SurvivorProfile = ({ onClose, onWorkshop, onBosses, onInventory, onClan }: Props) => {
  const { state, dispatch, derived, vkUser } = useGame();
  const [tab, setTab] = useState<Tab>('file');
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  const name = [vkUser?.first_name, vkUser?.last_name].filter(Boolean).join(' ') || state.playerName || 'Выживший';
  const room = LOCATIONS.find((item) => item.id === state.currentLocation)?.name ?? 'Неизвестно';
  const district = getDistrict(state.currentDistrict)?.name ?? 'Неизвестно';
  const durabilityMax = Math.max(1, state.weapon.maxDurability);
  const upgrades = [
    { label: 'Уровень', value: state.level, detail: '+1 уровень и +3 припасов', cost: levelUpCost(state.level), action: 'UPGRADE_LEVEL' as const },
    { label: 'Выносливость', value: state.baseStamina, detail: '+5 базовой выносливости', cost: staminaUpgradeCost(state.baseStamina), action: 'UPGRADE_STAMINA' as const },
    { label: 'Удача', value: state.luck, detail: '+15 базовой удачи', cost: luckUpgradeCost(state.luck), action: 'UPGRADE_LUCK' as const },
  ];
  const go = (callback: () => void) => { onClose(); callback(); };

  return <div className={styles.backdrop} onClick={onClose}>
    <section className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="survivor-title" onClick={(event) => event.stopPropagation()}>
      <header className={styles.header}>
        <div className={styles.headerLeft}><span className={styles.lamp} /><div><small>ЛИЧНОЕ ДЕЛО · АРХИВ ВЫЖИВШИХ</small><h2 id="survivor-title">ПРОФИЛЬ ВЫЖИВШЕГО</h2></div></div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть профиль">✕</button>
      </header>
      <div className={styles.tabs} role="tablist" aria-label="Разделы профиля">
        <button type="button" role="tab" aria-selected={tab === 'file'} className={tab === 'file' ? styles.activeTab : ''} onClick={() => setTab('file')}>ЛИЧНОЕ ДЕЛО</button>
        <button type="button" role="tab" aria-selected={tab === 'skills'} className={tab === 'skills' ? styles.activeTab : ''} onClick={() => { setFeedback(''); setTab('skills'); }}>НАВЫКИ</button>
        <button type="button" role="tab" aria-selected={tab === 'training'} className={tab === 'training' ? styles.activeTab : ''} onClick={() => setTab('training')}>ПРОКАЧКА</button>
      </div>
      {tab === 'file' ? <div className={styles.content} role="tabpanel">
        <div className={styles.hero}>
          <div className={styles.portrait}><span className={styles.portraitLabel}>ЛИЧНОЕ ДЕЛО / 01</span><img src="/pers1.png" alt="Персонаж выжившего" /><span className={styles.portraitFooter}>ПОСЛЕДНИЙ РУБЕЖ</span></div>
          <div className={styles.identity}>
            <span className={styles.sectionLabel}>● СТАТУС: ВЫЖИВШИЙ</span><h3>{name}</h3>
            <div className={styles.tags}><span>УРОВЕНЬ {format(state.level)}</span><span>★ {format(state.experience)} ОПЫТА</span></div>
            <p className={styles.caption}>Опыт накапливается за боссов и рейды. Уровень повышается отдельно во вкладке «Прокачка».</p>
            <div className={styles.meter}><div><span>ЗДОРОВЬЕ</span><strong>{format(state.health)} / {format(state.maxHealth)}</strong></div><progress value={state.health} max={state.maxHealth} aria-label="Здоровье" /></div>
            <div className={`${styles.meter} ${styles.energy}`}><div><span>ЭНЕРГИЯ</span><strong>{format(state.energy)} / {format(state.maxEnergy)}</strong></div><progress value={state.energy} max={state.maxEnergy} aria-label="Энергия" /></div>
            <div className={styles.location}>⌖ {district} <span>/</span> 🏠 {room}</div>
          </div>
        </div>
        <div className={styles.sectionHeading}><div><small>БОЕВАЯ ПОДГОТОВКА</small><h3>ХАРАКТЕРИСТИКИ</h3></div><span>ДАННЫЕ АКТУАЛЬНЫ</span></div>
        <div className={styles.stats}>
          {[['⚔', 'УРОН', format(derived.damage)], ['✚', 'ВЫНОСЛИВОСТЬ', format(derived.stamina)], ['♣', 'УДАЧА', format(derived.luck)], ['◎', 'ШАНС КРИТА', `${(derived.crit * 100).toFixed(1)}%`]].map(([icon, label, value]) => <div className={styles.stat} key={label}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>)}
        </div>
        <div className={styles.gear}>
          <div><small>СНАРЯЖЕНИЕ / ОСНОВНОЕ ОРУЖИЕ</small><h3>{state.weapon.icon} {state.weapon.name} <span>+{state.weapon.level}</span></h3><p className={state.weapon.broken ? styles.broken : ''}>{state.weapon.broken ? '⚠ ОРУЖИЕ СЛОМАНО' : `Прочность: ${format(state.weapon.durability)} / ${format(state.weapon.maxDurability)}`}</p><progress value={Math.min(state.weapon.durability, durabilityMax)} max={durabilityMax} aria-label="Прочность оружия" /></div>
          <button type="button" onClick={() => go(onWorkshop)}>МАСТЕРСКАЯ ↗</button>
        </div>
        <div className={styles.links}><button type="button" onClick={() => go(onInventory)}>▣ ИНВЕНТАРЬ</button><button type="button" onClick={() => go(onBosses)}>⚔ БОССЫ</button><button type="button" onClick={() => go(onClan)}>☠ КЛАН</button></div>
      </div> : tab === 'skills' ? <div className={styles.content} role="tabpanel">
        <div className={styles.sectionHeading}><div><small>ЛИЧНЫЕ УМЕНИЯ</small><h3>НАВЫКИ ВЫЖИВШЕГО</h3></div><span>ПАТРОНЫ: {format(state.bullets)}</span></div>
        <p className={styles.caption}>Постоянные улучшения за патроны. Каждый навык можно улучшить до {SKILL_MAX_LEVEL} уровня; цена следующего уровня растёт.</p>
        {state.battle && <p className={styles.feedback}>Завершите текущий бой, чтобы улучшать навыки.</p>}
        <div className={styles.skills}>{SKILL_DEFS.map((skill) => {
          const level = state.profileSkills[skill.id];
          const cost = skillCost(level);
          const maxed = level >= SKILL_MAX_LEVEL;
          return <article className={styles.skill} key={skill.id}>
            <img src={skill.icon} alt="" /><div className={styles.skillInfo}><small>УРОВЕНЬ {level} / {SKILL_MAX_LEVEL}</small><h3>{skill.name}</h3><p>{skill.description}</p><progress value={level} max={SKILL_MAX_LEVEL} aria-label={`Уровень навыка ${skill.name}`} /></div>
            <button type="button" disabled={maxed || !!state.battle || state.bullets < cost} onClick={() => { dispatch({ type: 'UPGRADE_PROFILE_SKILL', skillId: skill.id }); setFeedback('Навык улучшен.'); }}>{maxed ? 'МАКСИМУМ' : `УЛУЧШИТЬ · ${format(cost)} 🔫`}</button>
          </article>;
        })}</div>
        {feedback && <p className={styles.feedback} role="status">{state.lastMessage}</p>}
      </div> : <div className={styles.content} role="tabpanel">
        <div className={styles.sectionHeading}><div><small>ПОДГОТОВКА К ВЫХОДУ</small><h3>ПРОКАЧКА ПЕРСОНАЖА</h3></div><span>ПАТРОНЫ: {format(state.bullets)}</span></div>
        <p className={styles.caption}>Улучшения приобретаются за патроны. Накопленный опыт при этом не расходуется.</p>
        <div className={styles.upgrades}>{upgrades.map((item) => <article key={item.action} className={styles.upgrade}>
          <div><small>ТЕКУЩЕЕ ЗНАЧЕНИЕ · {format(item.value)}</small><h3>{item.label}</h3><p>{item.detail}</p></div>
          <button type="button" disabled={state.bullets < item.cost} onClick={() => { dispatch({ type: item.action }); setFeedback(`${item.label}: улучшение куплено.`); }}>УЛУЧШИТЬ · {format(item.cost)} 🔫</button>
        </article>)}</div>
        <p className={styles.caption}>Стоимость выносливости и удачи рассчитывается по базовым значениям, без бонусов экипировки.</p>
        {feedback && <p className={styles.feedback} role="status">{feedback} {state.lastMessage}</p>}
      </div>}
      <footer className={styles.footer}><span>FALLEN / АРХИВ ВЫЖИВШИХ</span><span>СОЕДИНЕНИЕ УСТАНОВЛЕНО ●</span></footer>
    </section>
  </div>;
};
