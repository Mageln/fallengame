import { useEffect, useRef, useState } from 'react';
import { GAME_IMAGES } from '../game/gameAssets';
import styles from '../style/LoadScreen.module.scss';

const SPARKS = 16;
const MIN_VISIBLE_MS = 1100;
const FADE_MS = 650;

const loadImage = (src: string): Promise<boolean> => new Promise((resolve) => {
  const image = new Image();
  let finished = false;
  const finish = (success: boolean) => {
    if (finished) return;
    finished = true;
    window.clearTimeout(timer);
    image.onload = null;
    image.onerror = null;
    resolve(success);
  };
  const timer = window.setTimeout(() => finish(false), 20000);
  image.onload = () => finish(true);
  image.onerror = () => finish(false);
  image.src = src;
});

// Единственная заставка игры: греет изображения и ждёт сохранение,
// показывая угли, дрожащий заголовок и ржавый индикатор с процентом.
export const LoadScreen = ({ done }: { done: boolean }) => {
  const [phase, setPhase] = useState<'in' | 'out' | 'gone'>('in');
  const [reducedMotion] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [completed, setCompleted] = useState(0);
  const [failed, setFailed] = useState(0);
  const [imagesDone, setImagesDone] = useState(false);
  const [skip, setSkip] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mountedAt = useRef(typeof performance !== 'undefined' ? performance.now() : 0);
  useEffect(() => {
    let cancelled = false;
    setCompleted(0); setFailed(0); setImagesDone(false);
    let bad = 0;
    Promise.all(GAME_IMAGES.map(async (src) => {
      const success = await loadImage(src);
      if (!success) bad += 1;
      if (!cancelled) setCompleted((value) => value + 1);
    })).then(() => {
      if (cancelled) return;
      setFailed(bad);
      setImagesDone(true);
    });
    return () => { cancelled = true; };
  }, [attempt]);
  const ready = done && imagesDone && (failed === 0 || skip);
  useEffect(() => {
    if (!ready || phase !== 'in') return;
    const waited = performance.now() - mountedAt.current;
    const timer = window.setTimeout(() => setPhase('out'), Math.max(0, MIN_VISIBLE_MS - waited));
    return () => window.clearTimeout(timer);
  }, [ready, phase]);
  useEffect(() => {
    if (phase !== 'out') return;
    const timer = window.setTimeout(() => setPhase('gone'), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);
  if (phase === 'gone') return null;
  const percent = Math.min(100, Math.round((completed / GAME_IMAGES.length) * 100));
  return <div className={`${styles.screen} ${phase === 'out' ? styles.leaving : ''}`} role="status" aria-label="Загрузка игры">
    <div className={styles.fog} aria-hidden="true" />
    <div className={styles.fogSecond} aria-hidden="true" />
    <img className={styles.campfire} src={reducedMotion ? '/campfire.png' : '/campfire.webp'} alt="" aria-hidden="true" />
    <h1 className={styles.title}>ПОСЛЕДНИЙ РУБЕЖ</h1>
    <p className={styles.subtitle}>ЗОМБИ-АПОКАЛИПСИС · ВЫЖИВАЮТ ПОДГОТОВЛЕННЫЕ</p>
    <div className={styles.bar} aria-hidden="true"><span className={styles.barGlow} /></div>
    {imagesDone && failed > 0 && !skip
      ? <div className={styles.fail}>
          <p className={styles.caption}>НЕ ЗАГРУЖЕНО ИЗОБРАЖЕНИЙ: {failed}</p>
          <div className={styles.actions}>
            <button type="button" onClick={() => setAttempt((value) => value + 1)}>ПОВТОРИТЬ</button>
            <button type="button" onClick={() => setSkip(true)}>ВОЙТИ БЕЗ НИХ</button>
          </div>
        </div>
      : <p className={styles.caption}>ЗАГРУЗКА УБЕЖИЩА… {percent}%</p>}
    <div className={styles.sparks} aria-hidden="true">
      {Array.from({ length: SPARKS }, (_, i) => <span key={i} className={styles.spark} style={{ '--spark-x': `${(i * 61) % 100}%`, '--spark-delay': `${(i % 8) * 0.35}s`, '--spark-size': `${2 + (i % 3)}px` } as React.CSSProperties} />)}
    </div>
  </div>;
};
