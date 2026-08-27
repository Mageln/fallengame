import {
  createHashRouter,
  createPanel,
  createRoot,
  createView,
  RoutesConfig,
} from '@vkontakte/vk-mini-apps-router';

export const DEFAULT_ROOT = 'default_root';

export const DEFAULT_VIEW = 'default_view';

export const DEFAULT_VIEW_PANELS = {
  HOME: 'home',
  PROFILE: 'profile',
  WORKSHOP: 'workshop',
  BATTLE: 'battle',
  RAID: 'raid',
  CLAN: 'clan',
  INVENTORY: 'inventory',
  QUESTS: 'quests',
  CRAFTING: 'crafting',
} as const;

export const routes = RoutesConfig.create([
  createRoot(DEFAULT_ROOT, [
    createView(DEFAULT_VIEW, [
      createPanel(DEFAULT_VIEW_PANELS.HOME, '/', []),
      createPanel(DEFAULT_VIEW_PANELS.PROFILE, '/profile', []),
      createPanel(DEFAULT_VIEW_PANELS.WORKSHOP, '/workshop', []),
      createPanel(DEFAULT_VIEW_PANELS.BATTLE, '/battle', []),
      createPanel(DEFAULT_VIEW_PANELS.RAID, '/raid', []),
      createPanel(DEFAULT_VIEW_PANELS.CLAN, '/clan', []),
      createPanel(DEFAULT_VIEW_PANELS.INVENTORY, '/inventory', []),
      createPanel(DEFAULT_VIEW_PANELS.QUESTS, '/quests', []),
      createPanel(DEFAULT_VIEW_PANELS.CRAFTING, '/crafting', []),
    ]),
  ]),
]);

export const router = createHashRouter(routes.getRoutes());
