import { useEffect, useRef, useState } from 'react';
import { getVkFriendsPage, inviteVkFriends, type VkUser } from '../services/vkApi';
import styles from '../style/Friends.module.scss';

const errorText = (error: unknown): string => error instanceof Error ? error.message : 'Не удалось получить список друзей VK. Проверьте разрешение и попробуйте снова.';

export const FriendsPanel = ({ onClose }: { onClose: () => void }) => {
  const [friends, setFriends] = useState<VkUser[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    setLoading(true);
    setError('');
    getVkFriendsPage().then((result) => {
      if (!active) return;
      setFriends(result.friends);
      setNextOffset(result.nextOffset);
    }).catch((failure: unknown) => { if (active) setError(errorText(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; mounted.current = false; };
  }, [attempt]);

  const loadMore = () => {
    if (loadingMore || nextOffset === null) return;
    setLoadingMore(true);
    setError('');
    void getVkFriendsPage(nextOffset).then((result) => {
      if (!mounted.current) return;
      setFriends((previous) => {
        const ids = new Set(previous.map((friend) => friend.id));
        return [...previous, ...result.friends.filter((friend) => !ids.has(friend.id))];
      });
      setNextOffset(result.nextOffset);
    }).catch((failure: unknown) => { if (mounted.current) setError(errorText(failure)); })
      .finally(() => { if (mounted.current) setLoadingMore(false); });
  };

  return <div className={styles.backdrop} onClick={onClose}>
    <section className={styles.panel} role="dialog" aria-modal="true" aria-label="Друзья VK" onClick={(event) => event.stopPropagation()}>
      <header><span className={styles.lamp} aria-hidden="true"/><div><small>РАЦИЯ · СИГНАЛ ДРУЗЕЙ</small><h2>👥 ДРУЗЬЯ VK</h2></div><button type="button" onClick={onClose} aria-label="Закрыть">✕</button></header>
      <p>Друзья VK, доступные приложению. Их игровой уровень и установка игры здесь не определяются.</p>
      {loading ? <p>Ищем сигналы друзей…</p> : friends.length ? <ul>{friends.map((friend) => <li key={friend.id}>
        {friend.photo_200 ? <img src={friend.photo_200} alt="" /> : <span aria-hidden="true">👤</span>}
        <div><strong>{friend.first_name} {friend.last_name}</strong></div>
        <span className={friend.online ? styles.online : styles.offline}>{friend.online === undefined ? 'Статус неизвестен' : friend.online ? '● В сети' : '○ Не в сети'}</span>
        <a href={`https://vk.com/id${friend.id}`} target="_blank" rel="noopener noreferrer">Профиль ↗</a>
      </li>)}</ul> : !error ? <p className={styles.empty}>Друзей не найдено. Список зависит от доступа и настроек приватности VK.</p> : null}
      {error && <p role="alert">Радиопомехи: {error}</p>}
      {!loading && error && friends.length === 0 && <button type="button" onClick={() => setAttempt((value) => value + 1)}>Повторить</button>}
      {!loading && nextOffset !== null && <button type="button" disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Загрузка…' : 'Показать ещё'}</button>}
      <button type="button" className={styles.invite} onClick={() => inviteVkFriends().catch((failure: unknown) => setError(errorText(failure)))}>📻 ПРИГЛАСИТЬ ДРУЗЕЙ</button>
    </section>
  </div>;
};
