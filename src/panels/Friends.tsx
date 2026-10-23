import { useEffect, useState } from 'react';
import { getPlayingFriends, inviteVkFriends, type VkUser } from '../services/vkApi';
import styles from '../style/Friends.module.scss';

export const FriendsPanel = ({ onClose }: { onClose: () => void }) => {
  const [friends, setFriends] = useState<VkUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    getPlayingFriends().then((result) => { if (active) setFriends(result); })
      .catch((failure: Error) => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <div className={styles.backdrop} onClick={onClose}>
    <section className={styles.panel} role="dialog" aria-modal="true" aria-label="Друзья в игре" onClick={(event) => event.stopPropagation()}>
      <header><span className={styles.lamp} aria-hidden="true"/><div><small>РАЦИЯ · СИГНАЛ ДРУЗЕЙ</small><h2>👥 ДРУЗЬЯ-ВЫЖИВШИЕ</h2></div><button type="button" onClick={onClose} aria-label="Закрыть">✕</button></header>
      {loading ? <p>Ищем сигналы друзей…</p> : friends.length ? <ul>{friends.map((friend) => <li key={friend.id}>
        {friend.photo_200 ? <img src={friend.photo_200} alt="" /> : <span aria-hidden="true">👤</span>}
        <div><strong>{friend.first_name} {friend.last_name}</strong><small>Уровень: {friend.level ?? 'неизвестен'}</small></div>
        <span className={friend.online ? styles.online : styles.offline}>{friend.online ? '● В сети' : '○ Не в сети'}</span>
        <a href={`https://vk.com/id${friend.id}`} target="_blank" rel="noopener noreferrer">Профиль ↗</a>
      </li>)}</ul> : <p className={styles.empty}>🧟 Пока никого… позови выживших. Показываются только друзья с установленной игрой; нужен доступ VK к друзьям.</p>}
      {error && <p role="alert">Радиопомехи: {error}</p>}
      <button type="button" className={styles.invite} onClick={() => inviteVkFriends().catch((failure: Error) => setError(failure.message))}>📻 ПРИГЛАСИТЬ ДРУЗЕЙ</button>
    </section>
  </div>;
};
