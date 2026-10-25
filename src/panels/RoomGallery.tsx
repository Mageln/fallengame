import { useState } from 'react';
import { useGame } from '../game/GameContext';
import { LOCATIONS } from '../game/constants';
import styles from '../style/RoomGallery.module.scss';

interface RoomGalleryProps {
  onClose: () => void;
}

export const RoomGallery = ({ onClose }: RoomGalleryProps) => {
  const { state } = useGame();
  const [currentIndex, setCurrentIndex] = useState(0);

  const room = LOCATIONS[currentIndex];
  const isUnlocked = state.unlockedRooms.includes(room.id);

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % LOCATIONS.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + LOCATIONS.length) % LOCATIONS.length);
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <section
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Галерея комнат"
        onClick={(e) => e.stopPropagation()}
      >


        <div className={styles.gallery}>
          <button
            type="button"
            className={styles.navButton}
            onClick={goPrev}
            aria-label="Предыдущая комната"
          >
            ◀
          </button>

          <div className={styles.roomCard}>
            <div className={styles.imageContainer}>
              <img
                src={`/room${room.id.replace('location', '')}.jpg`}
                alt={room.name}
                className={isUnlocked ? '' : styles.locked}
              />
              {!isUnlocked && (
                <div className={styles.lockOverlay}>
                  <span className={styles.lockIcon}>🔒</span>
                  <p>Комната заблокирована</p>
                </div>
              )}
            </div>

            <div className={styles.info}>
              <h3>{room.name}</h3>
              <p className={styles.status}>
                {isUnlocked ? '✅ Открыта' : '🔒 Заблокирована'}
              </p>

              <div className={styles.requirements}>
                <h4>Как получить:</h4>
                <p>
                  {isUnlocked
                    ? 'У вас уже есть эта комната'
                    : 'Побеждайте боссов и наносите больше урона. Шанс выпадения растет с уроном до 50%.'}
                </p>
              </div>

              <div className={styles.counter}>
                <span>{currentIndex + 1} / {LOCATIONS.length}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className={styles.navButton}
            onClick={goNext}
            aria-label="Следующая комната"
          >
            ▶
          </button>
        </div>
      </section>
    </div>
  );
};
