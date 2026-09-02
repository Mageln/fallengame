
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Panel,
  PanelHeader,
  Group,
  Button,
  Text,
  Title,
  Avatar,
  Box,
} from '@vkontakte/vkui';
import { Icon28User, Icon28CrownOutline } from '@vkontakte/icons';
import { FallenCanvas } from '../components/FallenCanvas/FallenCanvas';

interface MainPanelProps {
  id: string;
  goTo: (panel: string) => void;
}

export const Home: React.FC<MainPanelProps> = ({ id, goTo }) => {
  const [energy, setEnergy] = useState(42);
  const [maxEnergy] = useState(100);
  const [authority, setAuthority] = useState(1250);
  const [spicki, setSpicki] = useState(47);
  const [bullets, setBullets] = useState(32);

  const updateRef = useRef(false);

  // Обработчик клика по ресурсам
  const handleResourceClick = useCallback((resourceId: string) => {
    console.log('Нажата кнопка "+" для ресурса:', resourceId);
    updateRef.current = true;
    
    switch (resourceId) {
      case 'spicki':
        setSpicki(prev => {
          const newValue = prev + 1;
          console.log(`Спички: ${newValue}`);
          return newValue;
        });
        break;
      case 'bullets':
        setBullets(prev => {
          const newValue = prev + 1;
          console.log(`✅ Пули: ${newValue}`);
          return newValue;
        });
        break;
      case 'gold':
        console.log('Золото: пока не реализовано');
        break;
      case 'zhetons':
        console.log('Жетоны: пока не реализовано');
        break;
      case 'energy':
        setEnergy(prev => {
          const newValue = Math.min(prev + 5, maxEnergy);
          console.log(`Энергия: ${newValue}`);
          return newValue;
        });
        break;
      default:
        console.log(' Неизвестный ресурс:', resourceId);
        break;
    }
  }, [maxEnergy]);

  // Обработчик выполнения задания
  const handleTask = useCallback((taskId: string) => {
    console.log('🔵 Выполнено задание:', taskId);
    updateRef.current = true;
    
    const taskCosts: Record<string, number> = {
      '1': 20,
      '2': 35,
      '3': 15,
      '4': 10,
    };

    const cost = taskCosts[taskId] || 20;
    setEnergy(prev => prev - cost);
    
    switch (taskId) {
      case '1':
        setAuthority(prev => prev + 15);
        break;
      case '2':
        setAuthority(prev => prev + 30);
        break;
      case '3':
        setSpicki(prev => prev + 10);
        break;
      case '4':
        setBullets(prev => prev + 5);
        break;
    }
  }, []);

  // Автовосстановление энергии - только когда игра активна
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    // Запускаем интервал только если есть взаимодействие
    const startInterval = () => {
      interval = setInterval(() => {
        setEnergy(prev => {
          if (prev < maxEnergy) {
            updateRef.current = true;
            return Math.min(prev + 1, maxEnergy);
          }
          return prev;
        });
      }, 5000);
    };

    startInterval();
    return () => clearInterval(interval);
  }, [maxEnergy]);

  // Логирование состояния (только при изменении)
  useEffect(() => {
    if (updateRef.current) {
      console.log(`📊 Обновлено: Энергия=${energy}, Спички=${spicki}, Пули=${bullets}, Авторитет=${authority}`);
      updateRef.current = false;
    }
  }, [energy, spicki, bullets, authority]);

  return (
    <Panel id={id}>
      <PanelHeader 
        before={<Avatar size={36}><Icon28User /></Avatar>}
        after={<Button onClick={() => goTo('settings')}><Icon28CrownOutline /></Button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Title level="3">Зек Чекист</Title>
          <Text style={{ fontSize: '12px', opacity: 0.7 }}>Уровень 5 • Авторитет</Text>
        </div>
      </PanelHeader>

      <Group mode="plain">
        <Box style={{ padding: '0 12px' }}>
          <FallenCanvas
            onTaskComplete={handleTask}
            onResourceClick={handleResourceClick}
            energy={energy}
            maxEnergy={maxEnergy}
            authority={authority}
            spicki={spicki}
            bullets={bullets}
            playerName="Чекист"
            level={5}
            status="Авторитет"
          />
        </Box>
      </Group>
    </Panel>
  );
};