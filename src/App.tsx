import { useState, useEffect, ReactNode } from 'react';
import bridge, { UserInfo } from '@vkontakte/vk-bridge';
import { View, SplitLayout, SplitCol, ScreenSpinner } from '@vkontakte/vkui';
import { useActiveVkuiLocation } from '@vkontakte/vk-mini-apps-router';

import { Home, Profile, Workshop, Battle, Raid, Clan, Inventory, Quests, Crafting } from './panels';
import { DEFAULT_VIEW_PANELS } from './routes';
import { GameProvider } from './game/GameContext';

export const App = () => {
  const { panel: activePanel = DEFAULT_VIEW_PANELS.HOME } = useActiveVkuiLocation();
  const [fetchedUser, setUser] = useState<UserInfo | undefined>();
 
  // const [popout, setPopout] = useState<ReactNode | null>(<ScreenSpinner />);

  useEffect(() => {
    async function fetchData() {
      try {
        const user = await bridge.send('VKWebAppGetUserInfo');
        setUser(user);
      } catch {
        setUser(undefined);
      } finally {
        // setPopout(null);
        console.log("setPopout")
      }
    }
    fetchData();
  }, []);

  return (
    <GameProvider>
      <SplitLayout > 
        {/* popout={popout} */}
        <SplitCol>
          <View activePanel={activePanel}>
            <Home id={DEFAULT_VIEW_PANELS.HOME} userName={fetchedUser?.first_name} />
            <Profile id={DEFAULT_VIEW_PANELS.PROFILE} />
            <Workshop id={DEFAULT_VIEW_PANELS.WORKSHOP} />
            <Battle id={DEFAULT_VIEW_PANELS.BATTLE} />
            <Raid id={DEFAULT_VIEW_PANELS.RAID} />
            <Clan id={DEFAULT_VIEW_PANELS.CLAN} />
            <Inventory id={DEFAULT_VIEW_PANELS.INVENTORY} />
            <Quests id={DEFAULT_VIEW_PANELS.QUESTS} />
            <Crafting id={DEFAULT_VIEW_PANELS.CRAFTING} />
          </View>
        </SplitCol>
      </SplitLayout>
    </GameProvider>
  );
};
