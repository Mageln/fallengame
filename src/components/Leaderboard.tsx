import { useEffect, useState } from 'react';
import { useGame } from '../game/GameContext';
import { BACKEND_URL } from '../config/vkConfig';
import styles from '../style/Leaderboard.module.scss';

type Entry = { vkId: number; name: string; score: string; position: number };
type Board = { entries: Entry[]; me: Entry | null; weekStart: string | null };
export const Leaderboard = ({ kind }: { kind: 'boss' | 'arena' }) => {
  const { serverMode } = useGame();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<'week' | 'all'>('week');
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!open || !serverMode) return;
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
  }, [open, serverMode, kind, period, refresh]);
  return <section className={styles.board} aria-label={kind === 'boss' ? 'Рейтинг урона по боссам' : 'Рейтинг побед на арене'}>
    <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen(!open)}>🏆 {open ? 'СКРЫТЬ РЕЙТИНГ' : 'РЕЙТИНГ ИГРОКОВ'}</button>
    {open && <div>
      <h3>{kind === 'boss' ? 'Урон по всем боссам' : 'Победы на арене'}</h3>
      <p>Результаты учитываются после включения рейтинга на сервере. {kind === 'arena' ? 'Арена — бои против ботов.' : 'Учитываются одиночные и совместные бои.'}</p>
      {!serverMode ? <p role="status">Общий рейтинг доступен только с серверным прогрессом VK.</p> : <>
        <div className={styles.controls}><button type="button" aria-pressed={period === 'week'} onClick={() => setPeriod('week')}>НЕДЕЛЯ</button><button type="button" aria-pressed={period === 'all'} onClick={() => setPeriod('all')}>ВСЁ ВРЕМЯ</button><button type="button" onClick={() => setRefresh(value => value + 1)}>ОБНОВИТЬ</button></div>
        {period === 'week' && <p>Неделя начинается в понедельник в 00:00 UTC{board?.weekStart ? ` · с ${board.weekStart}` : ''}.</p>}
        {loading && <p role="status">Загрузка рейтинга…</p>}{error && <p role="alert">{error}</p>}
        {board && (board.entries.length ? <ol className={styles.list}>{board.entries.map(entry => <li key={entry.vkId} className={entry.vkId === board.me?.vkId ? styles.me : undefined}><span>#{entry.position} · {entry.name}</span><strong>{entry.score}</strong></li>)}</ol> : <p>Пока нет результатов.</p>)}
        {board?.me && board.me.position > 50 && <p className={styles.me}>Ваше место: #{board.me.position} · {board.me.score}</p>}
        {board && !board.me && <p>Вашего результата пока нет.</p>}
      </>}
    </div>}
  </section>;
};
