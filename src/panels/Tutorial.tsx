import { useEffect, useRef } from 'react';
import { TUTORIAL_STEPS, tutorialIsActive, tutorialViewStep } from '../game/tutorial';
import styles from '../style/Tutorial.module.scss';

const SAMPLE_IMAGES: Record<string, string> = {
  resources: '/icon/resources/supplies.png', skills: '/icon/skills/fist.svg', daily: '/icon/quests/chest.png', clan: '/icon/clans.png',
  profile: '/pers1.png', task: '/icon/quests/patrol.png', car: '/icon/quests/car.png',
  map: '/icon/raion.jpg', 'raid-start': '/icon/quests/raid.png', 'raid-claim': '/icon/quests/chest.png',
  boss: '/enemies/zombie.png', fist: '/enemies/zombie.png', weapon: '/enemies/zombie.png',
  'fist-block': '/enemies/zombie.png', block: '/enemies/zombie.png', 'fist-heal-1': '/enemies/zombie.png',
  'fist-heal-2': '/enemies/zombie.png', heal: '/enemies/zombie.png', rage: '/enemies/zombie-rage.png',
  arena: '/icon/arena.jpg', quests: '/icon/quest.png', equipment: '/icon/cloth.jpg',
  craft: '/icon/quests/craft.png', workshop: '/icon/quests/craft.png', store: '/icon/shop/store.png',
  shelter: '/icon/shelter.png', social: '/icon/friends.png',
};

// Учебные значения показывают результат предыдущего пробного действия;
// они не читают и не изменяют состояние настоящего боя.
const COMBAT_EXAMPLES: Record<string, { energy: number; bossHp: number; playerHp: number }> = {
  fist: { energy: 0, bossHp: 100, playerHp: 100 },
  weapon: { energy: 20, bossHp: 90, playerHp: 90 },
  'fist-block': { energy: 10, bossHp: 80, playerHp: 80 },
  block: { energy: 30, bossHp: 70, playerHp: 70 },
  'fist-heal-1': { energy: 10, bossHp: 70, playerHp: 65 },
  'fist-heal-2': { energy: 30, bossHp: 65, playerHp: 60 },
  heal: { energy: 50, bossHp: 60, playerHp: 55 },
  rage: { energy: 0, bossHp: 50, playerHp: 90 },
};

interface Props {
  version: number | undefined;
  step: number;
  onPractice: (stepId: string) => void;
  onSkip: () => void;
}

export const Tutorial = ({ version, step, onPractice, onSkip }: Props) => {
  const panelRef = useRef<HTMLElement>(null);
  const active = tutorialIsActive(version, step);
  const index = tutorialViewStep(version, step);
  useEffect(() => {
    if (!active) return;
    panelRef.current?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const buttons = panelRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
      if (!buttons?.length) { event.preventDefault(); return; }
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panelRef.current?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', trapFocus);
    return () => document.removeEventListener('keydown', trapFocus);
  }, [active, index]);
  if (!active) return null;
  const current = TUTORIAL_STEPS[index];
  const combat = COMBAT_EXAMPLES[current.id];
  return <div className={styles.backdrop}>
    <section ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="tutorial-title" aria-describedby="tutorial-instruction" tabIndex={-1}>
      <header className={styles.header}><div><small>РАЦИЯ · ТРЕНИРОВКА {index + 1} / {TUTORIAL_STEPS.length}</small><h2 id="tutorial-title">{current.title}</h2></div></header>
      <div className={styles.content}><p className={styles.story}>{current.story}</p><p id="tutorial-instruction">{current.instruction}</p></div>
      <progress value={index + 1} max={TUTORIAL_STEPS.length} aria-label="Ход тренировки" />
      <div className={styles.practice} aria-label="Учебный пример">
        <div className={styles.practiceHeading}>
          {SAMPLE_IMAGES[current.id] && <img src={SAMPLE_IMAGES[current.id]} alt="" draggable={false} />}
          <div><small>ТРЕНИРОВКА · НЕ ВЛИЯЕТ НА ИГРУ</small><strong>{current.example}</strong></div>
        </div>
        {combat && <div className={styles.combat}>
          <div><span>БОСС · {combat.bossHp} / 100 HP</span><progress value={combat.bossHp} max={100} aria-label="Учебное здоровье босса" /></div>
          <div><span>ГЕРОЙ · {combat.playerHp} / 100 HP</span><progress value={combat.playerHp} max={100} aria-label="Учебное здоровье героя" /></div>
          <div><span>БОЕВАЯ ЭНЕРГИЯ · {combat.energy} / 100</span><progress value={combat.energy} max={100} aria-label="Учебная боевая энергия" /></div>
        </div>}
        <div className={styles.controls}>
          <button type="button" className={styles.next} onClick={() => onPractice(current.id)}>{current.button}</button>
          {current.disabled?.map((label) => <button type="button" disabled key={label}>{label}</button>)}
        </div>
      </div>
      <footer className={styles.actions}><button type="button" className={styles.skip} onClick={() => { if (window.confirm('Пропустить тренировку? Повторно запустить её будет нельзя.')) onSkip(); }}>ПРОПУСТИТЬ ТРЕНИРОВКУ</button></footer>
    </section>
  </div>;
};
