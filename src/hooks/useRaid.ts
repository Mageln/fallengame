import { useState, useCallback } from 'react';



export const useRaid = () => {
    const [bossHealth, setBossHealth] = useState(1000);
    const [friends, setFriends] = useState<string[]>(['friend1', 'friend2']); // Заглушка

    const attackBoss = useCallback(() => {
        // Отправляем запрос на бэкенд: игрок X нанес урон боссу
        console.log("⚔️ Вы атаковали босса!");
        setBossHealth(prev => Math.max(0, prev - 50));
    }, []);

    const inviteFriendToRaid = useCallback(() => {
        // Здесь будет вызов bridge.send('VKWebAppShowInviteBox', {});
        console.log("📨 Приглашение другу отправлено!");
        alert("Функция приглашения друзей будет работать с VK Bridge!");
    }, []);

    return { bossHealth, attackBoss, inviteFriendToRaid, friends };
};