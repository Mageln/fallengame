import { useState, useEffect } from 'react';
import bridge, { UserInfo } from '@vkontakte/vk-bridge';
import { useActiveVkuiLocation } from '@vkontakte/vk-mini-apps-router';

import { Home } from './panels';
import { DEFAULT_VIEW_PANELS } from './routes';
import { GameProvider } from './game/GameContext';

export const App = () => {
  const { panel: activePanel = DEFAULT_VIEW_PANELS.HOME } = useActiveVkuiLocation();
  const [fetchedUser, setUser] = useState<UserInfo | undefined>();
 
  useEffect(() => {
    async function fetchData() {
      try {
        const user = await bridge.send('VKWebAppGetUserInfo');
        setUser(user);
      } catch {
        setUser(undefined);
      } finally {
        console.log("setPopout")
      }
    }
    fetchData();
  }, []);

  return (
    <GameProvider>
      <Home id={DEFAULT_VIEW_PANELS.HOME} userName={fetchedUser?.first_name} />
    </GameProvider>
  );
};
