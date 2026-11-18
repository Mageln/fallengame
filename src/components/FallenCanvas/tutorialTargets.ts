import type { ButtonPosition } from './canvasTypes';

export interface TutorialCanvas extends HTMLCanvasElement {
  tutorialButtons?: ButtonPosition[];
  revealTutorialButton?: (id: string) => void;
}
export interface TutorialRect { left: number; top: number; width: number; height: number }

// Canvas stores hit areas in CSS pixels; translate them to viewport coordinates.
export const canvasTargetRect = (canvas: TutorialCanvas, id: string): TutorialRect | null => {
  const canvasRect = canvas.getBoundingClientRect();
  if (id === 'resources') {
    return { left: canvasRect.left + canvasRect.width * 0.48, top: canvasRect.top, width: canvasRect.width * 0.5, height: 52 };
  }
  const target = canvas.tutorialButtons?.find((button) => button.id === id);
  return target ? { left: canvasRect.left + target.x, top: canvasRect.top + target.y, width: target.width, height: target.height } : null;
};

// The carousel must be scrolled to make the requested real icon visible.
export const tutorialCarouselOffset = (id: string): number | undefined => {
  if (['go_battle', 'go_district', 'go_boss'].includes(id)) return 0;
  if (id === 'go_cloth') return 2;
  if (id === 'go_komnata') return 3;
  return undefined;
};

export type TutorialTarget = { kind: 'canvas'; id: string; label: string } | { kind: 'element'; id: string; label: string };
export const TUTORIAL_TARGETS: Record<string, TutorialTarget> = {
  resources: { kind: 'canvas', id: 'resources', label: 'Ресурсы в верхней панели' },
  profile: { kind: 'canvas', id: 'go_profile', label: 'Профиль в верхнем левом углу' },
  skills: { kind: 'element', id: 'profile-skills', label: 'Вкладка навыков в профиле' },
  task: { kind: 'canvas', id: 'go_quests', label: 'Задания на нижней панели' },
  daily: { kind: 'element', id: 'login-claim', label: 'Получение награды за вход' },
  car: { kind: 'element', id: 'profile-car', label: 'Улучшение машины в профиле' },
  map: { kind: 'canvas', id: 'go_district', label: 'Районы на правой панели' },
  'raid-start': { kind: 'canvas', id: 'go_district', label: 'Карта районов и рейдов' },
  'raid-claim': { kind: 'canvas', id: 'go_district', label: 'Карта районов и рейдов' },
  boss: { kind: 'canvas', id: 'go_boss', label: 'Боссы на правой панели' },
  fist: { kind: 'element', id: 'boss-skill-jab', label: 'Удар кулаком в окне боя' },
  weapon: { kind: 'element', id: 'boss-skill-weapon', label: 'Удар оружием в окне боя' },
  'fist-block': { kind: 'element', id: 'boss-skill-jab', label: 'Удар кулаком в окне боя' },
  block: { kind: 'element', id: 'boss-skill-block', label: 'Блок в окне боя' },
  'fist-heal-1': { kind: 'element', id: 'boss-skill-jab', label: 'Удар кулаком в окне боя' },
  'fist-heal-2': { kind: 'element', id: 'boss-skill-jab', label: 'Удар кулаком в окне боя' },
  heal: { kind: 'element', id: 'boss-skill-heal', label: 'Исцеление в окне боя' },
  rage: { kind: 'element', id: 'boss-rage', label: 'Образ босса в фазе ярости' },
  arena: { kind: 'canvas', id: 'go_battle', label: 'Арена на правой панели' },
  quests: { kind: 'canvas', id: 'go_quests', label: 'Задания на нижней панели' },
  equipment: { kind: 'canvas', id: 'go_profile', label: 'Инвентарь открывается из профиля' },
  workshop: { kind: 'canvas', id: 'go_profile', label: 'Мастерская открывается из профиля' },
  store: { kind: 'canvas', id: 'go_cloth', label: 'Магазин на правой панели' },
  shelter: { kind: 'canvas', id: 'go_komnata', label: 'Комната на правой панели' },
  social: { kind: 'canvas', id: 'friends', label: 'Друзья на нижней панели' },
  clan: { kind: 'canvas', id: 'go_clan', label: 'Клан на нижней панели' },
};

export const TUTORIAL_SUBTARGETS: Record<string, TutorialTarget> = {
  skills: { kind: 'element', id: 'profile-skill-fist', label: 'Улучшение навыка кулака' },
  boss: { kind: 'element', id: 'boss-zombie', label: 'Обычный зомби в списке боссов' },
  task: { kind: 'element', id: 'district-task', label: 'Задание района и стоимость энергии' },
  equipment: { kind: 'element', id: 'profile-inventory', label: 'Инвентарь в профиле' },
  workshop: { kind: 'element', id: 'profile-workshop', label: 'Мастерская в профиле' },
  arena: { kind: 'element', id: 'arena-raider', label: 'Кнопка боя с противником арены' },
};
export const DIRECT_TUTORIAL_TARGETS = new Set(['resources', 'profile', 'car', 'daily', 'fist', 'weapon', 'fist-block', 'block', 'fist-heal-1', 'fist-heal-2', 'heal', 'rage']);
