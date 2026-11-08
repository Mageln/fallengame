import { TUTORIAL_STEPS, tutorialIsActive } from '../game/tutorial';
import type { TutorialDestination } from '../game/tutorial';
import styles from '../style/Tutorial.module.scss';

interface Props {
  version: number | undefined;
  step: number;
  minimized: boolean;
  onStart: () => void;
  onNext: () => void;
  onSkip: () => void;
  onMinimize: () => void;
  onResume: () => void;
  onDestination: (destination: TutorialDestination) => void;
}

export const Tutorial = ({ version, step, minimized, onStart, onNext, onSkip, onMinimize, onResume, onDestination }: Props) => {
  const active = tutorialIsActive(version, step);
  if (!active) return <button type="button" className={styles.launcher} onClick={onStart}>РАЦИЯ · ИСТОРИЯ И ОБУЧЕНИЕ</button>;
  if (minimized) return <button type="button" className={styles.launcher} onClick={onResume}>РАЦИЯ · ПРОДОЛЖИТЬ ОБУЧЕНИЕ</button>;
  const current = TUTORIAL_STEPS[step];
  return <aside className={styles.panel} aria-labelledby="tutorial-title" aria-describedby="tutorial-instruction">
    <header className={styles.header}>
      <div><small>РАЦИЯ · СООБЩЕНИЕ {step + 1} / {TUTORIAL_STEPS.length}</small><h2 id="tutorial-title">{current.title}</h2></div>
      <button type="button" className={styles.minimize} onClick={onMinimize} aria-label="Свернуть обучение">−</button>
    </header>
    <div className={styles.content} aria-live="polite"><p className={styles.story}>{current.story}</p><p id="tutorial-instruction">{current.instruction}</p></div>
    <progress value={step + 1} max={TUTORIAL_STEPS.length} aria-label="Ход обучения" />
    {current.destination && <button type="button" className={styles.destination} onClick={() => onDestination(current.destination!)}>{current.button}</button>}
    <footer className={styles.actions}>
      <button type="button" className={styles.skip} onClick={onSkip}>ПРОПУСТИТЬ ОБУЧЕНИЕ</button>
      <button type="button" className={styles.next} onClick={onNext}>{step === TUTORIAL_STEPS.length - 1 ? 'ЗАВЕРШИТЬ' : 'ДАЛЕЕ'}</button>
    </footer>
  </aside>;
};
