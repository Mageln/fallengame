import { Router } from 'express';
import { prisma } from '../prisma';

export const gameRouter = Router();

// Получение доступных зомби для боя
gameRouter.get('/zombies/available', async (req, res) => {
  try {
    const zombies = await prisma.zombie.findMany({
      where: { isActive: true },
      orderBy: { rarity: 'asc' }
    });
    res.json(zombies);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Начало боя
gameRouter.post('/battle/start', async (req, res) => {
  try {
    const { vkId, zombieId } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { vkId: parseInt(vkId) }
    });
    
    if (!user || user.energy < 10) {
      return res.status(400).json({ error: 'Недостаточно энергии' });
    }
    
    const zombie = await prisma.zombie.findUnique({
      where: { id: zombieId }
    });
    
    if (!zombie) {
      return res.status(404).json({ error: 'Зомби не найден' });
    }
    
    // Создаём бой
    const battle = await prisma.battle.create({
      data: {
        userId: user.id,
        zombieId,
        playerHealth: user.health,
        zombieHealth: zombie.health
      }
    });
    
    // Списываем энергию
    await prisma.user.update({
      where: { id: user.id },
      data: { energy: { decrement: 10 } }
    });
    
    res.json(battle);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Атака в бою
gameRouter.post('/battle/:battleId/attack', async (req, res) => {
  try {
    const { battleId } = req.params;
    const { playerId } = req.body;
    
    const battle = await prisma.battle.findUnique({
      where: { id: battleId },
      include: { user: true, zombie: true }
    });
    
    if (!battle || battle.result) {
      return res.status(400).json({ error: 'Бой не активен' });
    }
    
    // Расчёт урона игрока
    const weapon = await prisma.weapon.findFirst({
      where: { userId: playerId, equipped: true }
    });
    
    const playerDamage = weapon ? weapon.damage + Math.floor(Math.random() * 5) : 10;
    const zombieDamage = battle.zombie.damage + Math.floor(Math.random() * 3);
    
    // Обновляем здоровье
    const newPlayerHealth = Math.max(0, battle.playerHealth - zombieDamage);
    const newZombieHealth = Math.max(0, battle.zombieHealth - playerDamage);
    
    let result: 'win' | 'lose' | 'ongoing' = 'ongoing';
    
    if (newZombieHealth <= 0) {
      result = 'win';
      
      // Награды
      const rewardGold = battle.zombie.goldReward + Math.floor(Math.random() * 10);
      const rewardExp = battle.zombie.experience;
      
      await prisma.user.update({
        where: { id: battle.user.id },
        data: {
          health: newPlayerHealth,
          experience: { increment: rewardExp },
          gold: { increment: rewardGold }
        }
      });
      
      // Проверка повышения уровня
      const newLevel = Math.floor((battle.user.experience + rewardExp) / 100) + 1;
      if (newLevel > battle.user.level) {
        await prisma.user.update({
          where: { id: battle.user.id },
          data: { level: newLevel }
        });
      }
      
    } else if (newPlayerHealth <= 0) {
      result = 'lose';
    }
    
    // Обновляем бой
    const updatedBattle = await prisma.battle.update({
      where: { id: battleId },
      data: {
        playerHealth: newPlayerHealth,
        zombieHealth: newZombieHealth,
        result
      }
    });
    
    res.json(updatedBattle);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
