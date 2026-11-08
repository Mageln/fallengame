import { useEffect, useRef, useState } from 'react';
import { canvasTargetRect, DIRECT_TUTORIAL_TARGETS, TUTORIAL_SUBTARGETS, TUTORIAL_TARGETS } from '../components/FallenCanvas/tutorialTargets';
import type { TutorialCanvas, TutorialRect } from '../components/FallenCanvas/tutorialTargets';
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
  onLocate: (stepId: string) => void;
  onPractice: (stepId: string) => void;
  onSkip: () => void;
}

export const Tutorial = ({ version, step, onLocate, onPractice, onSkip }: Props) => {
  const panelRef = useRef<HTMLElement>(null);
  const active = tutorialIsActive(version, step);
  const index = tutorialViewStep(version, step);
  const stepId = active ? TUTORIAL_STEPS[index].id : '';
  const mainTarget = TUTORIAL_TARGETS[stepId];
  const [locatedId, setLocatedId] = useState('');
  const [position, setPosition] = useState<{ id: string; rect: TutorialRect } | null>(null);
  const [timedOutId, setTimedOutId] = useState('');
  const subtarget = locatedId === stepId ? TUTORIAL_SUBTARGETS[stepId] : undefined;
  const target = subtarget ?? (locatedId !== stepId ? mainTarget : undefined);
  const locating = !!target;
  const targetKey = `${stepId}:${subtarget ? 'detail' : 'navigation'}`;
  useEffect(() => {
    if (!active || !locating || !target) return;
    let scrolled = false;
    const update = () => {
      let rect: TutorialRect | null = null;
      if (target.kind === 'canvas') {
        const canvas = document.querySelector<TutorialCanvas>('canvas[data-tutorial-canvas]');
        canvas?.revealTutorialButton?.(target.id);
        if (canvas) rect = canvasTargetRect(canvas, target.id);
      } else {
        const preview = target.id.startsWith('boss-skill-') || target.id === 'boss-rage' ? 'battle'
          : target.id.startsWith('boss-') ? 'boss' : undefined;
        const scope = preview ? document.querySelector(`[data-tutorial-preview="${preview}"]`) : document;
        const element = scope?.querySelector<HTMLElement>(`[data-tutorial-target="${target.id}"]`);
        if (element) {
          if (!scrolled) { element.scrollIntoView?.({ block: 'center', inline: 'nearest' }); scrolled = true; }
          const box = element.getBoundingClientRect();
          if (box.width > 0 && box.height > 0) rect = { left: box.left, top: box.top, width: box.width, height: box.height };
        }
      }
      if (!rect || rect.width <= 0 || rect.height <= 0) return;
      setPosition((old) => old?.id === targetKey && Math.abs(old.rect.left - rect!.left) < 0.5 &&
        Math.abs(old.rect.top - rect!.top) < 0.5 && Math.abs(old.rect.width - rect!.width) < 0.5 &&
        Math.abs(old.rect.height - rect!.height) < 0.5 ? old : { id: targetKey, rect: rect! });
    };
    update();
    const interval = window.setInterval(update, 150);
    const timeout = window.setTimeout(() => setTimedOutId(targetKey), 3000);
    return () => { window.clearInterval(interval); window.clearTimeout(timeout); };
  }, [active, locating, stepId, target, targetKey]);
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
  }, [active, index, locating]);
  if (!active) return null;
  const current = TUTORIAL_STEPS[index];
  const combat = COMBAT_EXAMPLES[current.id];
  if (locating && target) {
    const rect = position?.id === targetKey ? position.rect : null;
    const locate = () => {
      if (subtarget) { onPractice(stepId); return; }
      onLocate(stepId);
      if (DIRECT_TUTORIAL_TARGETS.has(stepId)) onPractice(stepId);
      else setLocatedId(stepId);
    };
    return <div className={`${styles.backdrop} ${styles.locating} ${rect ? styles.hasTarget : ''}`}>
      <section ref={panelRef} className={`${styles.guidePanel} ${rect && rect.top > window.innerHeight * 0.55 ? styles.guideTop : ''}`} role="dialog" aria-modal="true" aria-labelledby="tutorial-guide-title" tabIndex={-1}>
        {rect && <button type="button" className={styles.spotlight} style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} onClick={locate} aria-label={`Найти: ${target.label}`} />}
        <small>РАЦИЯ · ТРЕНИРОВКА {index + 1} / {TUTORIAL_STEPS.length}</small>
        <h2 id="tutorial-guide-title">{current.title}</h2>
        <p>{current.story} {current.instruction}</p>
        <p>Тренировка не расходует ресурсы и не выдаёт наград.</p>
        <p>Нажмите на подсвеченное место в игре: <b>{target.label}</b>.</p>
        {!rect && <p role="status">Ищем элемент интерфейса…</p>}
        {!rect && timedOutId === targetKey && <button type="button" className={styles.next} onClick={locate}>ПРОДОЛЖИТЬ БЕЗ ПОДСВЕТКИ</button>}
        <button type="button" className={styles.skip} onClick={() => { if (window.confirm('Пропустить тренировку? Повторно запустить её будет нельзя.')) onSkip(); }}>ПРОПУСТИТЬ ТРЕНИРОВКУ</button>
      </section>
    </div>;
  }
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
