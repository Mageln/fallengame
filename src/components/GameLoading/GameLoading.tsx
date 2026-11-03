import { useEffect, useState, type ReactNode } from 'react';

// Изображения из папки public.
const GAME_IMAGES = [
  '/1.png',
  '/background.jpg',
  '/pers1.png',
  '/upperbackground.png',
  '/logo.svg',

  '/bossRoom/FonLoot.jpg',
  '/bossRoom/fonIconBoss.jpg',
  '/bossRoom/fonWinnera.jpg',

  '/enemy/avatar-boss.jpg',
  '/enemy/boss1.jpg',
  '/enemy/zombi.jpg',
  '/enemy/zombi1.jpg',

  '/icon/arena.jpg',
  '/icon/boss.jpg',
  '/icon/clans.jpg',
  '/icon/clans.png',
  '/icon/cloth.jpg',
  '/icon/friends.png',
  '/icon/kazino.jpg',
  '/icon/komnata.jpg',
  '/icon/personaz.jpg',
  '/icon/plus.png',
  '/icon/quest.png',
  '/icon/raion.jpg',

  '/icon/resource/bullets.png',
  '/icon/resource/energy.png',
  '/icon/resource/gold.png',
  '/icon/resource/spicki.png',
  '/icon/resource/zheton.png',

  '/map/iconboss.jpg',
  '/map/map.jpg',

  '/room1.jpg',
  '/room2.jpg',
  '/room3.jpg',
  '/room4.jpg',
  '/room5.jpg',
  '/room6.jpg',

  '/weapon/ak.jpg',
  '/weapon/awp.jpg',
  '/weapon/deagle.jpg',
  '/weapon/katana.jpg',
  '/weapon/m4a4.jpg',
  '/weapon/vetka.jpg',
  '/weapon/vintovka.jpg',
];

// Загружаем одно изображение.
// Если оно не загрузилось за 20 секунд, показываем ошибку.
const loadImage = (src: string): Promise<boolean> => {
  return new Promise((resolve) => {
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

    const timer = window.setTimeout(() => {
      finish(false);
    }, 20_000);

    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = src;
  });
};

export const GameLoading = ({ children }: { children: ReactNode }) => {
  const [attempt, setAttempt] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [continueAnyway, setContinueAnyway] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setCompleted(0);
    setFailed([]);
    setDone(false);

    const failedImages: string[] = [];

    Promise.all(
      GAME_IMAGES.map(async (src) => {
        const success = await loadImage(src);

        if (!success) {
          failedImages.push(src);
        }

        if (!cancelled) {
          setCompleted((value) => value + 1);
        }
      })
    ).then(() => {
      if (cancelled) return;

      setFailed(failedImages);
      setDone(true);
    });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Показываем игру, когда изображения загружены
  // или игрок решил продолжить без них.
  if (continueAnyway || (done && failed.length === 0)) {
    return <>{children}</>;
  }

  const percent = Math.round((completed / GAME_IMAGES.length) * 100);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#17120f',
        color: '#eee0c4',
        fontFamily: 'Arial, sans-serif',
        padding: 24,
      }}
    >
      <div
        role="status"
        aria-live="polite"
        style={{
          width: '100%',
          maxWidth: 360,
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            color: '#e7b74e',
            marginBottom: 12,
          }}
        >
          FALLEN GAME
        </h1>

        <p>
          {done
            ? 'Не удалось загрузить некоторые изображения.'
            : 'Загрузка игровых изображений...'}
        </p>

        <progress
          value={completed}
          max={GAME_IMAGES.length}
          aria-label="Загрузка изображений"
          style={{
            width: '100%',
            height: 18,
            accentColor: '#e7b74e',
          }}
        />

        <p>
          {percent}% · {completed} / {GAME_IMAGES.length}
        </p>

        {done && failed.length > 0 && (
          <>
            <p>
              Не загружено: {failed.length}. Проверьте интернет
              и повторите попытку.
            </p>

            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              style={{
                padding: '10px 16px',
                margin: 4,
                cursor: 'pointer',
              }}
            >
              Повторить
            </button>

            <button
              type="button"
              onClick={() => setContinueAnyway(true)}
              style={{
                padding: '10px 16px',
                margin: 4,
                cursor: 'pointer',
              }}
            >
              Войти без них
            </button>
          </>
        )}
      </div>
    </div>
  );
};