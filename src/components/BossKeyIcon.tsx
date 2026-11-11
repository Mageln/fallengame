import styles from '../style/Boss.module.scss';

// Each boss key has its own silhouette, color and emblem; it is not the generic raid key.
const designs: Record<string, { color: string; emblem: string; teeth: string }> = {
  zombie_brute: { color: '#84a967', emblem: 'M12 9l2 3 2-3 1 5-3 2-3-2z', teeth: 'M28 28v4h4v-4h3v-4' },
  '1': { color: '#c48b4e', emblem: 'M10 11h8M11 9v5m6-5v5m-6 0 3 2 3-2', teeth: 'M28 28v5h3v-3h4v-5' },
  '2': { color: '#809eb8', emblem: 'M14 8l5 2v4l-5 4-5-4v-4z M11 12h6', teeth: 'M28 28v4h3v-2h3v-4h2' },
  '3': { color: '#b47a82', emblem: 'M9 15l2-5 3 3 3-3 2 5-5 2z', teeth: 'M27 29v3h3v-3h2v3h3v-7' },
  '4': { color: '#d5ba6a', emblem: 'M14 8l1.4 3 3.3.4-2.4 2.3.6 3.3-2.9-1.6-2.9 1.6.6-3.3-2.4-2.3 3.3-.4z', teeth: 'M27 29v4h4v-3h4v-5' },
};

export const BossKeyIcon = ({ bossId }: { bossId: string }) => {
  const design = designs[bossId];
  if (!design) return null;
  return <svg className={styles.bossKeyIcon} viewBox="0 0 40 40" aria-hidden="true" focusable="false" data-boss-key={bossId}>
    <path d="M19 19l12 12 4-4-12-12" fill={design.color} stroke="#211b16" strokeWidth="2.2" strokeLinejoin="round" />
    <path d={design.teeth} fill="none" stroke="#211b16" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M14 3a11 11 0 1 0 0 22 11 11 0 0 0 0-22z" fill={design.color} stroke="#211b16" strokeWidth="2.5" />
    <circle cx="14" cy="14" r="7.5" fill="#302a23" stroke="#e1d4ad" strokeWidth=".8" />
    <path d={design.emblem} fill="none" stroke={design.color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
};
