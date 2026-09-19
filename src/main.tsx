import { createRoot } from 'react-dom/client';
import vkBridge from '@vkontakte/vk-bridge';
import { AppConfig } from './AppConfig.tsx';
import './style/global-styles.scss';

vkBridge.send('VKWebAppInit');

// Отладка событий VK Bridge (подписка на Failed-события)
vkBridge.subscribe((event) => {
  if (!event.detail) return;
  if (event.detail.type.endsWith('Failed')) {
    console.warn('VK Bridge error:', event.detail.type, event.detail.data);
  }
});

createRoot(document.getElementById('root')!).render(<AppConfig />);

if (import.meta.env.MODE === 'development') {
  import('./eruda.ts');
}
