import { Router } from 'express';
import { prisma } from '../prisma';

export const userRouter = Router();

// Получение профиля пользователя
userRouter.get('/:vkId', async (req, res) => {
  try {
    const { vkId } = req.params;
    const user = await prisma.user.findUnique({
      where: { vkId: parseInt(vkId) },
      include: {
        weapons: true,
        inventory: true,
        clothing: true,
        clan: {
          include: {
            members: {
              include: { user: true }
            }
          }
        }
      }
    });

    if (!user) {
      // Создаём нового пользователя, если не найден
      const newUser = await prisma.user.create({
        data: { vkId: parseInt(vkId) }
      });
      return res.json(newUser);
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновление характеристик пользователя
userRouter.put('/:vkId', async (req, res) => {
  try {
    const { vkId } = req.params;
    const data = req.body;
    
    const user = await prisma.user.update({
      where: { vkId: parseInt(vkId) },
      data
    });
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение топ игроков
userRouter.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await prisma.user.findMany({
      take: 100,
      orderBy: {
        authority: 'desc'
      },
      select: {
        id: true,
        vkId: true,
        username: true,
        avatarUrl: true,
        level: true,
        authority: true
      }
    });
    
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
