// The mini app can be hosted on its own domain inside VK. These parameters are
// used only for UI/environment detection, not as proof of a user's identity.
// Server authorization must independently verify the VK signature.
export const hasVkLaunchParams = (search: string): boolean => {
  const params = new URLSearchParams(search);
  return Boolean(params.get('vk_platform') && params.get('vk_app_id') && params.get('vk_user_id') && params.get('sign'));
};

export const shouldUseMockVkData = (isDevelopment: boolean, search: string): boolean =>
  isDevelopment && !hasVkLaunchParams(search);
