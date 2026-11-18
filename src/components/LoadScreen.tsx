import { useEffect, useRef, useState } from 'react';
import styles from '../style/LoadScreen.module.scss';

const SPARKS = 16;
const MIN_VISIBLE_MS = 1100;
const FADE_MS = 650;

// Заставка при загрузке: угли, дрожащий свет заголовка и ржавый индикатор.
// Держится не короче MIN_VISIBLE_MS и плавно уходит, когда игра готова.
export const LoadScreen = ({ done }: { done: boolean }) => {
  const [phase, setPhase] = useState<'in' | 'out' | 'gone'>('in');
  const mountedAt = useRef(typeof performance !== 'undefined' ? performance.now() : 0);
  useEffect(() => {
    if (!done || phase !== 'in') return;
    const waited = performance.now() - mountedAt.current;
    const delay = Math.max(0, MIN_VISIBLE_MS - waited);
    const timer = window.setTimeout(() => setPhase('out'), delay);
    return () => window.clearTimeout(timer);
  }, [done, phase]);
  useEffect(() => {
    if (phase !== 'out') return;
    const timer = window.setTimeout(() => setPhase('gone'), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);
  if (phase === 'gone') return null;
  return <div className={`${styles.screen} ${phase === 'out' ? styles.leaving : ''}`} role="status" aria-label="Загрузка игры">
    <div className={styles.fog} aria-hidden="true" />
    <div className={styles.fogSecond} aria-hidden="true" />
    <div className={styles.emblem} aria-hidden="true"><span className={styles.ring} /><span className={styles.core} /></div>
    <h1 className={styles.title}>ПОСЛЕДНИЙ РУБЕЖ</h1>
    <p className={styles.subtitle}>ЗОМБИ-АПОКАЛИПСИС · ВЫЖИВАЮТ ПОДГОТОВЛЕННЫЕ</p>
    <div className={styles.bar} aria-hidden="true"><span className={styles.barGlow} /></div>
    <p className={styles.caption}>ЗАГРУЗКА УБЕЖИЩА…</p>
    <div className={styles.sparks} aria-hidden="true">
      {Array.from({ length: SPARKS }, (_, i) => <span key={i} className={styles.spark} style={{ '--spark-x': `${(i * 61) % 100}%`, '--spark-delay': `${(i % 8) * 0.35}s`, '--spark-size': `${2 + (i % 3)}px` } as React.CSSProperties} />)}
    </div>
  </div>;
};
