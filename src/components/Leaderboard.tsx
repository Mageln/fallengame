import { useContext, useEffect, useState } from 'react';
import { GameContext } from '../game/GameContext';
import { BACKEND_URL } from '../config/vkConfig';
import styles from '../style/Leaderboard.module.scss';

type Entry = { vkId: number; name: string; score: string; position: number };
type Board = { entries: Entry[]; me: Entry | null; weekStart: string | null };

// Компактная кнопка в панели; сам рейтинг живёт в отдельном оверлее со своим скроллом,
// чтобы не распирать макет экрана боссов и арены.
export const Leaderboard = ({ kind, serverMode }: { kind: 'boss' | 'arena'; serverMode?: boolean }) => {
  const game = useContext(GameContext);
  const mode = serverMode ?? game?.serverMode ?? false;
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<'week' | 'all'>('week');
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!open || !mode) return;
    const abort = new AbortController();
    setBoard(null); setError(''); setLoading(true);
    const params = new URLSearchParams({ kind, period });
    fetch(`${BACKEND_URL.replace(/\/$/, '')}/api/leaderboards?${params}`, { headers: { 'X-VK-Launch-Params': window.location.search }, signal: abort.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Не удалось загрузить рейтинг.');
        if (!Array.isArray(data.entries)) throw new Error('Некорректный ответ сервера.');
        return data as Board;
      }).then(setBoard).catch(err => { if (!abort.signal.aborted) setError(err instanceof Error ? err.message : 'Не удалось загрузить рейтинг.'); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [open, mode, kind, period, refresh]);
  return <>
    <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen(!open)}>
      🏆 РЕЙТИНГ · {kind === 'boss' ? 'УРОН ПО БОССАМ' : 'ПОБЕДЫ НА АРЕНЕ'}
    </button>
    {open && <div className={styles.overlay} onClick={() => setOpen(false)}>
      <section className={styles.panel} role="dialog" aria-modal="true" aria-label={kind === 'boss' ? 'Рейтинг урона по боссам' : 'Рейтинг побед на арене'} onClick={(event) => event.stopPropagation()}>
        <header className={styles.header}>
          <h3>🏆 {kind === 'boss' ? 'УРОН ПО ВСЕМ БОССАМ' : 'ПОБЕДЫ НА АРЕНЕ'}</h3>
          <button type="button" aria-label="Закрыть рейтинг" onClick={() => setOpen(false)}>✕</button>
        </header>
        <div className={styles.controls}>
          <button type="button" aria-pressed={period === 'week'} onClick={() => setPeriod('week')}>НЕДЕЛЯ</button>
          <button type="button" aria-pressed={period === 'all'} onClick={() => setPeriod('all')}>ВСЁ ВРЕМЯ</button>
          <button type="button" className={styles.refresh} onClick={() => setRefresh(value => value + 1)}>ОБНОВИТЬ</button>
        </div>
        {period === 'week' && <p className={styles.hint}>Неделя начинается в понедельник в 00:00 UTC{board?.weekStart ? ` · с ${board.weekStart}` : ''}.</p>}
        {!mode ? <p className={styles.hint} role="status">Общий рейтинг доступен только с серверным прогрессом VK.</p> : <>
          <p className={styles.hint}>{kind === 'arena' ? 'Учитываются победы над ботами арены.' : 'Учитываются одиночные и совместные бои.'} Результаты появляются после включения рейтинга на сервере.</p>
          {loading && <p className={styles.hint} role="status">Загрузка рейтинга…</p>}
          {error && <p className={styles.hint} role="alert">{error}</p>}
          {board && (board.entries.length ? <ol className={styles.list}>{board.entries.map(entry => <li key={entry.vkId} className={entry.vkId === board.me?.vkId ? styles.me : undefined}><span>#{entry.position} · {entry.name}</span><strong>{entry.score}</strong></li>)}</ol> : <p className={styles.hint}>Пока нет результатов.</p>)}
          {board && !board.me && <p className={styles.hint}>Вашего результата пока нет.</p>}
        </>}
        {board?.me && board.me.position > 50 && <p className={styles.meFooter}>Ваше место: #{board.me.position} · {board.me.score}</p>}
      </section>
    </div>}
  </>;
};
