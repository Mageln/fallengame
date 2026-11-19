// Мигающие линии костюма — отдельный DOM-слой поверх canvas, поэтому его видимость
// надо решать здесь: слой умеет стоять только в координатах домашней комнаты.
export interface SuitLineScene {
  battle?: unknown;
  showMap?: boolean;
  showProfile?: boolean;
  showBossModal?: boolean;
  showRoomModal?: boolean;
}

/**
 * Линии показываются только на домашнем экране. Бой (рейд, арена, гастроли),
 * карта районов, профиль и окно комнаты рисуются поверх персонажа или вместо него,
 * и трещины в координатах комнаты висели бы поверх чужого экрана.
 */
export const suitLinesVisible = (scene: SuitLineScene): boolean => !(
  scene.battle || scene.showMap || scene.showProfile || scene.showBossModal || scene.showRoomModal
);
